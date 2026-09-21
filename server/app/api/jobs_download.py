"""Export file download endpoint (binary success / envelope error)."""

from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.core.envelope import AppError, EnvelopeRoute
from app.db import get_db
from app.models.export_job import JOB_DONE
from app.repositories import job_repo

router = APIRouter(route_class=EnvelopeRoute)
EXPORT_DIR = Path(__file__).resolve().parents[2] / "exports"


@router.get("/export-jobs/{job_id}/download")
def download_export(job_id: str, db: Session = Depends(get_db)) -> FileResponse:
    job = job_repo.get(db, job_id)
    if job is None:
        raise AppError(2001, "导出任务不存在", http_status=404)
    if job.status != JOB_DONE:
        raise AppError(2002, "导出任务尚未完成", http_status=409)
    path = EXPORT_DIR / (job.file_name or "")
    if not path.is_file():
        raise AppError(4001, "导出文件已过期", http_status=410)
    media_type = "text/csv; charset=utf-8" if path.suffix == ".csv" else "application/json"
    return FileResponse(
        path, media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{path.name}"},
    )
