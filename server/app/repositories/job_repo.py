"""导出任务数据访问层。"""

from __future__ import annotations

from app.core.clock import utcnow
from app.models.export_job import ACTIVE_STATUSES, JOB_QUEUED, JOB_RUNNING, ExportJob
from sqlalchemy import or_
from sqlmodel import Session, select


def add(session: Session, job: ExportJob) -> ExportJob:
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def get(session: Session, job_id: str) -> ExportJob | None:
    return session.get(ExportJob, job_id)


def find_by_idempotency_key(session: Session, key: str) -> ExportJob | None:
    statement = select(ExportJob).where(ExportJob.idempotency_key == key)
    return session.exec(statement).first()


def list_jobs(
    session: Session,
    *,
    page: int,
    page_size: int,
    status: str | None,
    active_only: bool,
) -> tuple[list[ExportJob], int]:
    statement = select(ExportJob)
    if active_only:
        statement = statement.where(ExportJob.status.in_(ACTIVE_STATUSES))
    elif status:
        statement = statement.where(ExportJob.status == status)
    total = len(session.exec(statement).all())  # 教学级：万级任务规模足够
    items = session.exec(
        statement.order_by(ExportJob.created_at.desc())  # type: ignore[union-attr]
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(items), total


def claim_next(session: Session, lease_seconds: int) -> ExportJob | None:
    """抢占下一个任务：QUEUED，或 RUNNING 且租约过期（视为卡死可重领）。"""
    now = utcnow()
    from datetime import timedelta

    statement = (
        select(ExportJob)
        .where(
            or_(
                ExportJob.status == JOB_QUEUED,
                (ExportJob.status == JOB_RUNNING) & (ExportJob.lease_until < now),  # type: ignore[operator]
            )
        )
        .order_by(ExportJob.created_at)  # type: ignore[union-attr]
        .limit(1)
    )
    job = session.exec(statement).first()
    if job is None:
        return None
    job.status = JOB_RUNNING
    job.lease_until = now + timedelta(seconds=lease_seconds)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job
