"""seed --profile demo 的规模与演示友好性（B-D6）。

--count 500 --profile demo 跑一遍，断言：
总数 500、三种 asset_type 都有、demo 模式下最近 1 小时的条目 ≥ 50。
"""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.db import make_engine
from app.models import Asset
from sqlalchemy import func
from sqlmodel import Session, select

SERVER_DIR = Path(__file__).resolve().parents[1]


def test_demo画像_类型齐全_最近一小时不少于50条(tmp_path) -> None:
    # Arrange + Act：以 demo 画像生成 500 条到独立临时库
    db_path = tmp_path / "seed.db"
    result = subprocess.run(
        [
            sys.executable, "-m", "app.seed",
            "--count", "500", "--db", str(db_path), "--profile", "demo",
        ],
        cwd=SERVER_DIR,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,  # 手动断言 returncode，保留 stderr 便于定位
    )
    assert result.returncode == 0, result.stderr

    # Assert：总数 / 类型区分度 / demo 新鲜度
    engine = make_engine(db_path)
    with Session(engine) as session:
        total = session.exec(select(func.count()).select_from(Asset)).one()
        types = set(session.exec(select(Asset.asset_type)).all())
        # SQLite 读回的 created_at 为 naive，阈值同样取 naive UTC
        threshold = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
        recent = session.exec(
            select(func.count()).select_from(Asset).where(Asset.created_at >= threshold)
        ).one()

    assert total == 500
    assert types == {"image", "video", "script"}
    assert recent >= 50
