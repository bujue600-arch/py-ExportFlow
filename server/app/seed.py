"""Generate deterministic development Asset data.

Run from the ``server`` directory with ``python -m app.seed``，
或从仓库根目录 ``PYTHONPATH=server python -m app.seed``。

分布约定（保证筛选组合有区分度）：
- 三种 asset_type 各约 1/3（按序号轮转，严格均等）；
- status 加权分布：draft 20% / ready 70% / failed 10%；
- 标签池 10 个，每条随机 1–3 个；
- 标题从 5 类模板生成：漫剧/封面/配乐/剧本/混剪 + 序号。

``--profile demo``：前 50 条创建时间集中在最近 1 小时（演示列表顶部有新鲜数据）。
"""

from __future__ import annotations

import argparse
import random
import time
from datetime import timedelta
from pathlib import Path

from sqlmodel import Session, SQLModel, delete

from app.core.clock import utcnow
from app.db import make_engine
from app.models import Asset

TITLE_TEMPLATES = ("漫剧", "封面", "配乐", "剧本", "混剪")
TAGS = ("精选", "教程", "素材", "原创", "商业", "生活", "旅行", "音乐", "热点", "幕后")
ASSET_TYPES = ("image", "video", "script")
STATUSES = ("draft", "ready", "failed")
STATUS_WEIGHTS = (20, 70, 10)
DEMO_RECENT_COUNT = 50
DEMO_RECENT_WINDOW_SECONDS = 3600


def generate_assets(
    count: int, *, seed: int = 42, profile: str | None = None
) -> list[Asset]:
    rng = random.Random(seed)
    now = utcnow()
    assets: list[Asset] = []
    for index in range(count):
        if profile == "demo" and index < DEMO_RECENT_COUNT:
            created_at = now - timedelta(
                seconds=rng.randint(0, DEMO_RECENT_WINDOW_SECONDS)
            )
        else:
            created_at = now - timedelta(seconds=rng.randint(0, 90 * 86400))
        assets.append(
            Asset(
                id=f"asset_{index + 1:06d}",
                title=f"{rng.choice(TITLE_TEMPLATES)} {index + 1:05d}",
                asset_type=ASSET_TYPES[index % len(ASSET_TYPES)],
                status=rng.choices(STATUSES, weights=STATUS_WEIGHTS)[0],
                tags=rng.sample(TAGS, rng.randint(1, 3)),
                size_bytes=rng.randint(1024, 500 * 1024 * 1024),
                created_at=created_at,
            )
        )
    return assets


def seed_database(count: int, db_path: Path, *, profile: str | None = None) -> int:
    started = time.perf_counter()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = make_engine(db_path)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.exec(delete(Asset))
        session.add_all(generate_assets(count, profile=profile))
        session.commit()
    print(f"生成耗时: {time.perf_counter() - started:.2f}s")
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ExportFlow Asset seed data")
    parser.add_argument("--count", type=int, default=10000)
    parser.add_argument("--db", type=Path, default=Path("server/exportflow.db"))
    parser.add_argument(
        "--profile",
        choices=["demo"],
        default=None,
        help="demo：前 50 条创建时间集中在最近 1 小时（演示友好）",
    )
    args = parser.parse_args()
    if args.count < 0:
        parser.error("--count must be non-negative")
    print(f"实际插入条数: {seed_database(args.count, args.db, profile=args.profile)}")


if __name__ == "__main__":
    main()
