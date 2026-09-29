"""队列边界测试：租约重抢 / 版本单调 / 幂等推进 / 重放窗口（B-D5）。

锁定队列的四条关键正确性：
1. RUNNING 任务租约过期后可被重新抢占（卡死恢复）；
2. job_version 随每次状态推进严格单调递增；
3. 幂等键重试命中已推进的任务时，返回原任务的最新态而非新建；
4. 事件重放窗口滑动的边界值（window_exceeded / replay_after）。
"""

from __future__ import annotations

from datetime import timedelta, timezone
from itertools import pairwise

from app.core.clock import utcnow
from app.repositories import job_repo
from app.services import job_service
from app.services.event_bus import bus
from app.services.queue_worker import run_once
from fastapi.testclient import TestClient
from sqlmodel import Session


def _create(client: TestClient, *, key: str):
    return client.post(
        "/api/export-jobs",
        json={"mode": "SELECTED_IDS", "selected_ids": ["a1"], "format": "csv"},
        headers={"Idempotency-Key": key},
    )


def test_租约过期_RUNNING任务可被重新抢占(db_session: Session) -> None:
    # Arrange：创建任务并手动抢占为 RUNNING
    dto = job_service.create_job(
        db_session,
        mode="SELECTED_IDS",
        selected_ids=["a1"],
        filter_payload=None,
        excluded_ids=None,
        export_format="csv",
        idempotency_key="k-lease",
    )
    first = job_repo.claim_next(db_session, lease_seconds=30)
    assert first is not None
    assert first.id == dto["id"]
    assert first.status == "RUNNING"

    # Act：把租约改成过去时间（模拟 worker 卡死），再次抢占
    first.lease_until = utcnow() - timedelta(seconds=1)
    db_session.add(first)
    db_session.commit()
    second = job_repo.claim_next(db_session, lease_seconds=30)

    # Assert：同一个任务被重新领取，且租约已续到未来（SQLite 读回为 naive，补 tzinfo 再比）
    assert second is not None
    assert second.id == dto["id"]
    assert second.lease_until is not None
    assert second.lease_until.replace(tzinfo=timezone.utc) > utcnow()


def test_任务状态推进_job_version严格单调(db_session: Session) -> None:
    # Arrange：创建任务（初始 version=1）
    dto = job_service.create_job(
        db_session,
        mode="SELECTED_IDS",
        selected_ids=["a1"],
        filter_payload=None,
        excluded_ids=None,
        export_format="csv",
        idempotency_key="k-version",
    )
    assert dto["job_version"] == 1

    # Act：claim → 进度上报 → 完成，逐步收集版本号
    versions: list[int] = []
    job = job_service.claim_next(db_session)
    assert job is not None
    versions.append(job.job_version)
    job = job_service.bump_and_publish(
        db_session, job, processed_count=10, total_count=100, progress=10
    )
    versions.append(job.job_version)
    job = job_service.complete_job(
        db_session, job, file_name="x.csv", file_size=1, total=100
    )
    versions.append(job.job_version)

    # Assert：版本序列严格递增
    assert versions == [2, 3, 4]
    assert all(later > earlier for earlier, later in pairwise(versions))


def test_幂等键_重试期间任务状态推进_仍返回最新态(
    client: TestClient, db_session: Session
) -> None:
    # Arrange：创建任务并执行到 FAILED（占位执行器必失败，版本已推进）
    first = _create(client, key="k-retry").json()["data"]
    assert run_once(db_session) is True
    failed = client.get(f"/api/export-jobs/{first['id']}").json()["data"]
    assert failed["status"] == "FAILED"
    assert failed["job_version"] > 1

    # Act：同一幂等键同载荷重试
    second = _create(client, key="k-retry").json()["data"]

    # Assert：返回原任务的最新态，而不是新建一个任务
    assert second["id"] == first["id"]
    assert second["status"] == "FAILED"
    assert second["job_version"] == failed["job_version"]


def test_事件重放窗口_边界值() -> None:
    # Arrange：发布 3 个事件后把 seq=1 挤出日志（模拟窗口滑动）
    for index in range(3):
        bus.publish("job_updated", {"n": index + 1})
    bus._log.popleft()

    # Act + Assert：last_seq=0 已滑出窗口；last_seq=1 只能重放 seq 2,3
    assert bus.window_exceeded(0) is True
    replayed = bus.replay_after(1)
    assert [event.seq for event in replayed] == [2, 3]
