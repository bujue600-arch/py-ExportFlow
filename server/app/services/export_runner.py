"""Export job execution: selection resolution, limits, and file generation."""

from __future__ import annotations

import csv
import json
from collections.abc import Callable
from pathlib import Path

from sqlmodel import Session

from app.core.envelope import AppError
from app.models.asset import Asset
from app.models.export_job import ExportJob
from app.repositories import asset_repo
from app.services import job_service

EXPORT_DIR = Path(__file__).resolve().parents[2] / "exports"
BATCH_SIZE = 500


def _filter_assets(session: Session, job: ExportJob) -> tuple[list[Asset], int]:
    params = dict(job.filter or {})
    params.pop("page", None)
    params.pop("page_size", None)
    # Pull the snapshot in bounded pages.  This keeps a large filter from
    # turning into one unbounded database result while retaining the frozen
    # selection semantics for the job.
    items, total = asset_repo.list_assets(session, page=1, page_size=BATCH_SIZE, **params)
    pages = (total + BATCH_SIZE - 1) // BATCH_SIZE
    for page in range(2, pages + 1):
        batch, _ = asset_repo.list_assets(
            session, page=page, page_size=BATCH_SIZE, **params
        )
        items.extend(batch)
    # Only IDs that actually belong to the filter snapshot may be subtracted
    # from the hit count.  An excluded ID from another filter (or a deleted
    # asset) has no effect on the selected set.
    excluded = set(job.excluded_ids or [])
    matching_excluded = {item.id for item in items if item.id in excluded}
    return [item for item in items if item.id not in excluded], total - len(matching_excluded)


def _selected_assets(session: Session, job: ExportJob) -> list[Asset]:
    return asset_repo.get_by_ids(session, list(job.selected_ids or []))


def _write_csv(
    path: Path, assets: list[Asset], *, on_batch: Callable[[int], None]
) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["id", "title", "asset_type", "status", "tags", "size_bytes", "created_at"],
        )
        writer.writeheader()
        for start in range(0, len(assets), BATCH_SIZE):
            for asset in assets[start : start + BATCH_SIZE]:
                row = asset.to_dto()
                row["tags"] = json.dumps(row["tags"], ensure_ascii=False)
                writer.writerow(row)
            on_batch(min(start + BATCH_SIZE, len(assets)))


def _write_json(
    path: Path, assets: list[Asset], *, on_batch: Callable[[int], None]
) -> None:
    # Stream batches into a valid JSON array instead of materializing another
    # complete list of DTO dictionaries.
    with path.open("w", encoding="utf-8") as handle:
        handle.write("[")
        first = True
        for start in range(0, len(assets), BATCH_SIZE):
            for asset in assets[start : start + BATCH_SIZE]:
                if not first:
                    handle.write(",")
                handle.write(json.dumps(asset.to_dto(), ensure_ascii=False))
                first = False
            on_batch(min(start + BATCH_SIZE, len(assets)))
        handle.write("]")


def execute_export(session: Session, job: ExportJob) -> None:
    """Execute one claimed job; state updates use job_service's single entry."""
    try:
        if job.mode == "SELECTED_IDS":
            selected_ids = list(job.selected_ids or [])
            if not selected_ids or len(selected_ids) > job_service.EXPORT_LIMIT:
                raise AppError(1002, f"显式勾选数量必须在 1~{job_service.EXPORT_LIMIT} 之间")
            assets = _selected_assets(session, job)
            if len(assets) != len(set(selected_ids)):
                raise RuntimeError("选择的作品不存在")
            total = len(assets)
        elif job.mode == "FILTER":
            assets, selected_total = _filter_assets(session, job)
            if selected_total > job_service.EXPORT_LIMIT:
                raise AppError(
                    3001,
                    "筛选结果超过导出上限",
                    data={"limit": job_service.EXPORT_LIMIT, "total": selected_total},
                )
            total = len(assets)
        else:
            raise AppError(1002, "未知导出模式")

        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        extension = job.format.lower()
        path = EXPORT_DIR / f"{job.id}.{extension}"
        job_service.bump_and_publish(session, job, total_count=total, processed_count=0, progress=0)
        def report_batch(processed: int) -> None:
            job_service.bump_and_publish(
                session,
                job,
                total_count=total,
                processed_count=processed,
                progress=int(processed * 100 / total) if total else 100,
            )
        if extension == "csv":
            _write_csv(path, assets, on_batch=report_batch)
        elif extension == "json":
            _write_json(path, assets, on_batch=report_batch)
        else:
            raise AppError(1002, "导出格式不支持")
        job_service.complete_job(session, job, file_name=path.name, file_size=path.stat().st_size, total=total)
    except AppError as exc:
        job_service.fail_job(session, job, exc.code, exc.message)
    except Exception as exc:
        job_service.fail_job(session, job, 3003, f"导出执行异常：{type(exc).__name__}")
