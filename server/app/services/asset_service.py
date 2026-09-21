"""Asset list business service."""

from __future__ import annotations

from datetime import datetime

from app.core.envelope import AppError
from app.repositories import asset_repo
from sqlmodel import Session


def list_assets(session: Session, **params) -> dict:
    page = params.get("page", 1)
    page_size = params.get("page_size", 20)
    if page < 1 or not 1 <= page_size <= 100:
        raise AppError(1001, "分页参数非法", http_status=422)
    items, total = asset_repo.list_assets(session, **params)
    return {
        "items": [item.to_dto() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
