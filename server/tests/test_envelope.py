"""信封机制的六类场景：成功包装、业务错误、HTTP 错误映射、参数校验、
trace_id 透传、未捕获异常兜底。用一个装配了同套机制的临时应用验证
（不污染业务路由）。"""

from __future__ import annotations

from app.core.envelope import AppError, EnvelopeRoute, register_exception_handlers
from app.core.trace import TraceIdMiddleware
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient


def make_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.add_middleware(TraceIdMiddleware)
    register_exception_handlers(test_app)
    router = APIRouter(route_class=EnvelopeRoute)

    @router.get("/ping")
    def ping() -> dict[str, object]:
        return {"pong": True, "items": [1, 2]}

    @router.get("/boom")
    def boom() -> None:
        raise AppError(3001, "导出超上限", http_status=400, data={"limit": 1000, "total": 5000})

    @router.get("/notfound")
    def notfound() -> None:
        raise HTTPException(status_code=404, detail="资源不存在")

    @router.get("/echo")
    def echo(q: int) -> dict[str, int]:
        return {"q": q}

    @router.get("/kaboom")
    def kaboom() -> None:
        raise RuntimeError("故意崩溃")

    test_app.include_router(router, prefix="/api")
    return test_app


def client() -> TestClient:
    return TestClient(make_test_app(), raise_server_exceptions=False)


def test_成功响应_被包装为信封() -> None:
    resp = client().get("/api/ping")

    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["message"] == "ok"
    assert body["data"] == {"pong": True, "items": [1, 2]}
    assert body["trace_id"]


def test_业务错误_AppError_归一为信封() -> None:
    resp = client().get("/api/boom")

    assert resp.status_code == 400
    body = resp.json()
    assert body["code"] == 3001
    assert body["data"] == {"limit": 1000, "total": 5000}


def test_HTTP异常_404_映射错误码2001() -> None:
    resp = client().get("/api/notfound")

    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == 2001
    assert body["message"] == "资源不存在"


def test_参数校验失败_映射1001_携带details() -> None:
    resp = client().get("/api/echo")  # 缺必填 q

    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == 1001
    assert body["data"]["details"]


def test_请求头携带XRequestId_信封透传该值() -> None:
    resp = client().get("/api/ping", headers={"X-Request-Id": "trace-abc-123"})

    body = resp.json()
    assert body["trace_id"] == "trace-abc-123"
    assert resp.headers["X-Trace-Id"] == "trace-abc-123"


def test_未捕获异常_兜底5000_不泄漏堆栈() -> None:
    resp = client().get("/api/kaboom")

    assert resp.status_code == 500
    body = resp.json()
    assert body["code"] == 5000
    assert body["message"] == "服务器内部错误"
    assert "故意崩溃" not in body["message"]
