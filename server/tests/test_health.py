"""健康检查端点（信封豁免）与 trace_id 响应头。"""

from app.main import app
from fastapi.testclient import TestClient


def test_healthz_豁免信封_返回原始形状() -> None:
    client = TestClient(app)
    resp = client.get("/healthz")

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_healthz_响应头携带_trace_id() -> None:
    client = TestClient(app)
    resp = client.get("/healthz")

    assert resp.headers["X-Trace-Id"]
