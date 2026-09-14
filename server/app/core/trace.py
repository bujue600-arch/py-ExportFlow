"""trace_id 中间件与结构化日志（api-contract.md §6）。

trace_id 生命周期：请求进入（透传 X-Request-Id 或生成）→ 写入
request.state（给信封用）与 ContextVar（给日志用）→ 响应头 X-Trace-Id 回传。
ContextVar 类似前端的 AsyncLocalStorage：async 任务间隔离、不会串号。
"""

from __future__ import annotations

import logging
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

trace_id_var: ContextVar[str] = ContextVar("trace_id", default="-")

access_logger = logging.getLogger("app.access")


class TraceIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        trace_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]
        trace_id_var.set(trace_id)
        request.state.trace_id = trace_id
        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        access_logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
        return response


class TraceIdLogFilter(logging.Filter):
    """把 ContextVar 里的 trace_id 注入每条日志记录。"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = trace_id_var.get()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(name)s %(levelname)s [%(trace_id)s] %(message)s")
    )
    handler.addFilter(TraceIdLogFilter())
    root = logging.getLogger()
    if not any(isinstance(h, logging.StreamHandler) and getattr(h, "formatter", None) and "trace_id" in (h.formatter._fmt or "") for h in root.handlers):
        root.handlers = [handler]
    root.setLevel(level)
