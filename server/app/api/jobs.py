"""导出任务 API（api-contract.md §3、§5）。"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlmodel import Session

from app.core.envelope import AppError, EnvelopeRoute
from app.db import get_db
from app.services import job_service

# 注意：APIRouter.include_router 不会继承父路由器的 route_class，
# 因此每个业务子路由器必须显式声明 EnvelopeRoute（否则信封漏包）。
router = APIRouter(route_class=EnvelopeRoute)


class ExportCreateBody(BaseModel):
    mode: Literal["SELECTED_IDS", "FILTER"]
    selected_ids: list[str] | None = None
    filter: dict | None = None
    excluded_ids: list[str] | None = None
    format: Literal["csv", "json"]


@router.post("/export-jobs")
async def create_export_job(
    body: ExportCreateBody,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
) -> dict:
    if not idempotency_key:
        # 契约 §5 要求请求头必填；缺失归入载荷非法（1002）
        raise AppError(1002, "缺少 Idempotency-Key 请求头", http_status=400)
    return job_service.create_job(
        db,
        mode=body.mode,
        selected_ids=body.selected_ids,
        filter_payload=body.filter,
        excluded_ids=body.excluded_ids,
        export_format=body.format,
        idempotency_key=idempotency_key,
    )


@router.get("/export-jobs")
async def list_export_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
) -> dict:
    return job_service.list_jobs(
        db, page=page, page_size=page_size, status=status, active_only=active_only
    )


@router.get("/export-jobs/{job_id}")
async def get_export_job(job_id: str, db: Session = Depends(get_db)) -> dict:
    return job_service.get_job(db, job_id)
