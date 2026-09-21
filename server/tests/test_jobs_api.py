"""导出任务 API：创建/幂等/载荷校验/详情/列表/worker 执行兜底（api-contract §5）。"""

from __future__ import annotations

from app.models.export_job import ExportJob
from app.services import job_service
from app.services.queue_worker import run_once
from fastapi.testclient import TestClient


def create(client: TestClient, *, ids=None, mode="SELECTED_IDS", key="k-1",
           filter_payload=None, excluded=None, with_key=True, fmt="csv"):
    payload: dict = {"mode": mode, "format": fmt}
    if ids is not None:
        payload["selected_ids"] = ids
    if filter_payload is not None:
        payload["filter"] = filter_payload
    if excluded is not None:
        payload["excluded_ids"] = excluded
    headers = {"Idempotency-Key": key} if with_key else {}
    return client.post("/api/export-jobs", json=payload, headers=headers)


def test_创建任务_SUCCESS_形状符合契约(client: TestClient) -> None:
    resp = create(client, ids=["a1", "a2"], key="k-create")

    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    data = body["data"]
    assert data["id"].startswith("job_")
    assert data["status"] == "QUEUED"
    assert data["job_version"] == 1
    assert data["file"] is None and data["error"] is None
    assert data["progress"] == 0


def test_幂等_同键同载荷_返回原任务(client: TestClient) -> None:
    first = create(client, ids=["a1"], key="k-idem").json()["data"]
    second = create(client, ids=["a1"], key="k-idem").json()["data"]

    assert second["id"] == first["id"]
    assert second["job_version"] == 1


def test_幂等冲突_同键异载荷_3002(client: TestClient) -> None:
    first_id = create(client, ids=["a1"], key="k-conflict").json()["data"]["id"]

    resp = create(client, ids=["a2"], key="k-conflict")

    body = resp.json()
    assert resp.status_code == 409
    assert body["code"] == 3002
    assert body["data"]["existing_job_id"] == first_id


def test_选择集超上限_1002(client: TestClient) -> None:
    resp = create(client, ids=[f"a{i}" for i in range(1001)], key="k-limit")

    assert resp.status_code == 400
    assert resp.json()["code"] == 1002


def test_空选择集_1002(client: TestClient) -> None:
    resp = create(client, ids=[], key="k-empty")

    assert resp.json()["code"] == 1002


def test_FILTER_缺筛选_1002(client: TestClient) -> None:
    resp = create(client, mode="FILTER", key="k-filter")

    assert resp.json()["code"] == 1002


def test_缺幂等键请求头_1002(client: TestClient) -> None:
    resp = create(client, ids=["a1"], with_key=False)

    assert resp.json()["code"] == 1002


def test_任务不存在_2001(client: TestClient) -> None:
    resp = client.get("/api/export-jobs/job_nope")

    assert resp.status_code == 404
    assert resp.json()["code"] == 2001


def test_active_only_过滤已完结(client: TestClient, db_session) -> None:
    id1 = create(client, ids=["a1"], key="k-1").json()["data"]["id"]
    id2 = create(client, ids=["a2"], key="k-2").json()["data"]["id"]
    job_service.complete_job(
        db_session, db_session.get(ExportJob, id1), file_name="f.csv", file_size=10, total=1,
    )

    resp = client.get("/api/export-jobs", params={"active_only": True})

    items = resp.json()["data"]["items"]
    assert [j["id"] for j in items] == [id2]


def test_worker_run_once_执行占位执行器_失败3003且版本递增(client: TestClient, db_session) -> None:
    job_id = create(client, ids=["a1", "a2"], key="k-run").json()["data"]["id"]

    assert run_once(db_session) is True

    detail = client.get(f"/api/export-jobs/{job_id}").json()["data"]
    assert detail["status"] == "FAILED"
    assert detail["error"]["code"] == "3003"
    assert detail["job_version"] == 3  # 创建1 → 抢占RUNNING2 → 失败3
