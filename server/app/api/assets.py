"""作品列表 API。"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.envelope import EnvelopeRoute
from app.db import get_db
from app.services import asset_service

router = APIRouter(route_class=EnvelopeRoute)


@router.get("/assets")
def list_assets(
    page: int = Query(1),
    page_size: int = Query(20),
    asset_type: Literal["image", "video", "script"] | None = None,
    status: Literal["draft", "ready", "failed"] | None = None,
    tag: str | None = None,
    keyword: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    sort: Literal["created_at", "-created_at", "size_bytes"] = "-created_at",
    db: Session = Depends(get_db),
) -> dict:
    return asset_service.list_assets(
        db,
        page=page,
        page_size=page_size,
        asset_type=asset_type,
        status=status,
        tag=tag,
        keyword=keyword,
        created_from=created_from,
        created_to=created_to,
        sort=sort,
    )
