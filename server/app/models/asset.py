"""作品 Asset 表模型（api-contract.md §4）。"""

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from app.core.clock import utcnow


class Asset(SQLModel, table=True):
    __tablename__ = "asset"

    id: str = Field(primary_key=True)
    title: str
    asset_type: str = Field(index=True)
    status: str = Field(index=True)
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    size_bytes: int
    created_at: datetime = Field(default_factory=utcnow, index=True)

    def to_dto(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "asset_type": self.asset_type,
            "status": self.status,
            "tags": list(self.tags or []),
            "size_bytes": self.size_bytes,
            "created_at": self.created_at.isoformat(),
        }
