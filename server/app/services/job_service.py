"""导出任务业务层：创建（幂等）、查询、状态机推进的**单一入口** bump_and_publish。

RULES-backend #8：job_version 只能经 bump_and_publish 递增并广播——
所有可观测变更（状态/进度/计数/错误）必须走这里，保证事件与版本严格同步。
"""

from __future__ import annotations

import hashlib
import json
from datetime import timedelta

from app.core.clock import utcnow
from app.core.envelope import AppError
from app.models.export_job import (
    JOB_DONE,
    JOB_FAILED,
    JOB_RUNNING,
    ExportJob,
)
from app.repositories import job_repo
from app.services.event_bus import bus
from sqlmodel import Session

EXPORT_LIMIT = 1000  # api-contract §2 / selection-payload §4
LEASE_SECONDS = 30


def to_job_dto(job: ExportJob) -> dict:
    """契约 §5 的 ExportJob 形状。"""
    return {
        "id": job.id,
        "status": job.status,
        "format": job.format,
        "total_count": job.total_count,
        "processed_count": job.processed_count,
        "progress": job.progress,
        "job_version": job.job_version,
        "created_at": job.created_at.isoformat(),
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "file": (
            {"name": job.file_name, "size_bytes": job.file_size}
            if job.file_name
            else None
        ),
        "error": (
            {"code": job.error_code, "message": job.error_message}
            if job.error_code
            else None
        ),
    }


def _event_data(job: ExportJob) -> dict:
    data = {
        "job_id": job.id,
        "job_version": job.job_version,
        "status": job.status,
        "progress": job.progress,
        "total_count": job.total_count,
        "processed_count": job.processed_count,
    }
    if job.error_code:
        data["error"] = {"code": job.error_code, "message": job.error_message}
    return data


def bump_and_publish(session: Session, job: ExportJob, **updates) -> ExportJob:
    """唯一的状态推进入口：应用字段 → version+1 → 落库 → 广播 job_updated。"""
    for key, value in updates.items():
        setattr(job, key, value)
    if job.status == JOB_RUNNING:
        # 心跳即续租：推进中的任务不会被误判卡死（RULES-backend #10）
        job.lease_until = utcnow() + timedelta(seconds=LEASE_SECONDS)
    job.job_version += 1
    session.add(job)
    session.commit()
    session.refresh(job)
    bus.publish("job_updated", _event_data(job))
    return job


def create_job(
    session: Session,
    *,
    mode: str,
    selected_ids: list[str] | None,
    filter_payload: dict | None,
    excluded_ids: list[str] | None,
    export_format: str,
    idempotency_key: str,
) -> dict:
    # 幂等判定在前：同键同载荷返回原任务，同键异载荷 3002（契约 §5）
    canonical = json.dumps(
        {"mode": mode, "selected_ids": selected_ids, "filter": filter_payload,
         "excluded_ids": excluded_ids, "format": export_format},
        sort_keys=True, ensure_ascii=False, default=str,
    )
    payload_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    existing = job_repo.find_by_idempotency_key(session, idempotency_key)
    if existing is not None:
        if existing.payload_hash == payload_hash:
            return to_job_dto(existing)
        raise AppError(
            3002, "幂等键冲突：同一幂等键对应不同载荷", http_status=409,
            data={"existing_job_id": existing.id},
        )

    # 载荷校验（selection-payload §4）：SELECTED_IDS 非空且 ≤1000；FILTER 必须带筛选
    if mode == "SELECTED_IDS":
        if not selected_ids or len(selected_ids) > EXPORT_LIMIT:
            raise AppError(1002, f"显式勾选数量必须在 1~{EXPORT_LIMIT} 之间", http_status=400)
    elif mode == "FILTER":
        if not filter_payload:
            raise AppError(1002, "FILTER 模式必须携带筛选条件", http_status=400)
    else:
        raise AppError(1002, f"未知导出模式：{mode}", http_status=400)

    import uuid

    job = ExportJob(
        id=f"job_{uuid.uuid4().hex[:12]}",
        status="QUEUED",
        format=export_format,
        mode=mode,
        selected_ids=selected_ids,
        filter=filter_payload,
        excluded_ids=excluded_ids,
        idempotency_key=idempotency_key,
        payload_hash=payload_hash,
    )
    job = job_repo.add(session, job)
    bus.publish("job_updated", _event_data(job))  # 创建即 version=1 事件，供在线客户端更新列表
    return to_job_dto(job)


def get_job(session: Session, job_id: str) -> dict:
    job = job_repo.get(session, job_id)
    if job is None:
        raise AppError(2001, "导出任务不存在", http_status=404)
    return to_job_dto(job)


def list_jobs(
    session: Session, *, page: int, page_size: int, status: str | None, active_only: bool,
) -> dict:
    items, total = job_repo.list_jobs(
        session, page=page, page_size=page_size, status=status, active_only=active_only,
    )
    return {
        "items": [to_job_dto(j) for j in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def snapshot(session: Session) -> dict:
    """SSE 首连/重放窗口外的全量校准数据（sse-events.md §3）。"""
    jobs, _total = job_repo.list_jobs(session, page=1, page_size=100, status=None, active_only=False)
    return {
        "jobs": [to_job_dto(j) for j in jobs],
        "max_job_version_map": {j.id: j.job_version for j in jobs},
    }


def claim_next(session: Session) -> ExportJob | None:
    """worker 抢占：翻状态到 RUNNING 并 bump（发布事件）。"""
    job = job_repo.claim_next(session, LEASE_SECONDS)
    if job is None:
        return None
    return bump_and_publish(session, job)


def fail_job(session: Session, job: ExportJob, code: int, message: str) -> ExportJob:
    return bump_and_publish(
        session, job,
        status=JOB_FAILED, finished_at=utcnow(),
        error_code=str(code), error_message=message,
    )


def complete_job(
    session: Session, job: ExportJob, *, file_name: str, file_size: int, total: int,
) -> ExportJob:
    return bump_and_publish(
        session, job,
        status=JOB_DONE, finished_at=utcnow(), progress=100,
        total_count=total, processed_count=total,
        file_name=file_name, file_size=file_size,
    )
