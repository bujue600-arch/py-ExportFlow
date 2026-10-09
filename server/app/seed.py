"""Generate deterministic development Asset data.

Run from the repository root with ``python -m app.seed`` and ``--app-dir server``
or from the ``server`` directory.
"""

from __future__ import annotations

import argparse
import random
from datetime import timedelta
from pathlib import Path

from sqlmodel import Session, SQLModel, delete

from app.core.clock import utcnow
from app.db import make_engine
from app.models import Asset

TITLE_PARTS = (
    "春日", "城市", "旅途", "夜色", "海边", "山野", "产品", "实验室",
    "幕后", "记忆", "光影", "声音", "创作", "故事", "日常", "灵感",
    "新媒体", "工作室", "节奏", "远方",
)
TAGS = ("精选", "教程", "素材", "原创", "商业", "生活", "旅行", "音乐")
ASSET_TYPES = ("image", "video", "script")
STATUSES = ("draft", "ready", "failed")


def generate_assets(count: int, *, seed: int = 42) -> list[Asset]:
    rng = random.Random(seed)
    now = utcnow()
    assets: list[Asset] = []
    for index in range(count):
        parts = rng.sample(TITLE_PARTS, 2)
        assets.append(
            Asset(
                id=f"asset_{index + 1:06d}",
                title=f"{parts[0]}{parts[1]} {index + 1:05d}",
                asset_type=rng.choice(ASSET_TYPES),
                status=rng.choice(STATUSES),
                tags=rng.sample(TAGS, rng.randint(1, 3)),
                size_bytes=rng.randint(1024, 500 * 1024 * 1024),
                created_at=now - timedelta(seconds=rng.randint(0, 90 * 86400)),
            )
        )
    return assets


def seed_database(count: int, db_path: Path) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = make_engine(db_path)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.exec(delete(Asset))
        session.add_all(generate_assets(count))
        session.commit()
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ExportFlow Asset seed data")
    parser.add_argument("--count", type=int, default=10000)
    parser.add_argument("--db", type=Path, default=Path("server/exportflow.db"))
    args = parser.parse_args()
    if args.count < 0:
        parser.error("--count must be non-negative")
    print(f"实际插入条数: {seed_database(args.count, args.db)}")


if __name__ == "__main__":
    main()
