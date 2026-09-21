"""Asset 查询数据访问层。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Text, cast, func
from sqlmodel import Session, select

from app.models.asset import Asset


def list_assets(
    session: Session,
    *,
    page: int,
    page_size: int,
    asset_type: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    keyword: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    sort: str = "-created_at",
) -> tuple[list[Asset], int]:
    statement = select(Asset)
    if asset_type:
        statement = statement.where(Asset.asset_type == asset_type)
    if status:
        statement = statement.where(Asset.status == status)
    if tag:
        # SQLite stores tags as JSON text. JSON-aware functions are unavailable
        # on every supported SQLite build, so match a quoted JSON string token.
        statement = statement.where(cast(Asset.tags, Text).like(f'%"{tag}"%'))
    if keyword:
        statement = statement.where(func.lower(Asset.title).contains(keyword.lower()))
    if created_from:
        statement = statement.where(Asset.created_at >= created_from)
    if created_to:
        statement = statement.where(Asset.created_at <= created_to)

    total = session.exec(select(func.count()).select_from(statement.subquery())).one()
    if sort == "created_at":
        statement = statement.order_by(Asset.created_at.asc())
    elif sort == "size_bytes":
        statement = statement.order_by(Asset.size_bytes.asc())
    else:
        statement = statement.order_by(Asset.created_at.desc())
    items = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return list(items), int(total)


def get_by_ids(session: Session, ids: list[str]) -> list[Asset]:
    if not ids:
        return []
    return list(session.exec(select(Asset).where(Asset.id.in_(ids))).all())
