"""测试基建：临时 SQLite + 事件总线隔离 + 关闭后台 worker（确定性）。"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # server/ 加入导入路径
os.environ.setdefault("EXPORTFLOW_WORKER", "0")

import pytest
from app.db import get_db, make_engine
from app.services.event_bus import bus
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel


@pytest.fixture(autouse=True)
def _reset_bus():
    bus.reset()
    yield
    bus.reset()


@pytest.fixture()
def db_session(tmp_path):
    """每个测试独立临时库。"""
    engine = make_engine(tmp_path / "test.db")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture()
def client(db_session):
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()
