"""统一响应信封（docs/specs/api-contract.md §1–2）。

职责：
- 成功响应在「路由分发层」统一包装为 {code, message, data, trace_id}；
- 业务错误经 AppError 抛出，由全局处理器归一化为信封；
- FastAPI 校验错误(422)、HTTPException、未捕获异常分别映射到契约错误码。

设计说明（为什么在 route 层包而不是 BaseHTTPMiddleware 改写 body）：
响应体是只能读一次的流，中间件改写需先读全文再重包，与流式响应
（D4 的 SSE / 文件下载）天然冲突；APIRoute 层拿到的还是端点返回值，
包装干净且不影响非 JSON 响应直通。
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

logger = logging.getLogger("app.error")


class AppError(Exception):
    """业务错误。code 必须取自契约错误码表，禁止现场发明。"""

    def __init__(
        self,
        code: int,
        message: str,
        *,
        http_status: int = 400,
        data: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.data = data


def build_envelope(code: int, message: str, data: Any, trace_id: str) -> dict[str, Any]:
    """构造信封字典（练习 D2-1 会在这里动手）。"""
    return {"code": code, "message": message, "data": data, "trace_id": trace_id}


def _trace_id_of(request: Request) -> str:
    return getattr(request.state, "trace_id", "")


class EnvelopeRoute(APIRoute):
    """路由类：端点只返回 data 本体，信封在此统一附加。"""

    def get_route_handler(self) -> Callable[[Request], Any]:
        original = super().get_route_handler()

        async def wrapped(request: Request) -> Response:
            response = await original(request)
            # 只包装 JSON 数据响应；SSE/文件流（无 body 或非 JSON media_type）直通。
            # 注意不能用 isinstance(response, JSONResponse) 判断：当路由带返回类型
            # 注解（FastAPI 视其为 response_model）时，返回的是裸 Response。
            media_type = response.media_type or ""
            raw_body = getattr(response, "body", None)
            if not media_type.startswith("application/json") or raw_body is None:
                return response
            content = json.loads(raw_body)
            payload = build_envelope(0, "ok", content, _trace_id_of(request))
            return JSONResponse(content=jsonable_encoder(payload), status_code=response.status_code)

        return wrapped


# 4xx 中未列出的状态统一归 1001；5xx 归 5000（契约 v1.1）
_HTTP_STATUS_TO_CODE = {404: 2001, 409: 2002, 410: 4001, 422: 1001}


def register_exception_handlers(app: FastAPI) -> None:
    """全局异常归一化：任何错误出口都是信封。"""

    @app.exception_handler(AppError)
    async def on_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            build_envelope(exc.code, exc.message, exc.data, _trace_id_of(request)),
            status_code=exc.http_status,
        )

    @app.exception_handler(RequestValidationError)
    async def on_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = exc.errors()[:10]
        return JSONResponse(
            build_envelope(1001, "参数校验失败", {"details": details}, _trace_id_of(request)),
            status_code=422,
        )

    @app.exception_handler(StarletteHTTPException)
    async def on_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_STATUS_TO_CODE.get(exc.status_code, 5000 if exc.status_code >= 500 else 1001)
        message = exc.detail if isinstance(exc.detail, str) else "请求失败"
        return JSONResponse(
            build_envelope(code, message, None, _trace_id_of(request)),
            status_code=exc.status_code,
        )

    @app.exception_handler(Exception)
    async def on_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("未捕获异常 path=%s", request.url.path)
        return JSONResponse(
            build_envelope(5000, "服务器内部错误", None, _trace_id_of(request)),
            status_code=500,
        )
