"""SQLite 引擎与会话依赖（B 的数据层基于此扩展）。

约定：
- 默认开发库 server/exportflow.db（.gitignore 已排除）；
- 测试用 make_engine(tmp_path / "test.db") 自建引擎，再通过
  app.dependency_overrides[get_db] 注入——FastAPI 的依赖覆盖机制，
  不需要 mock 数据库内部。
"""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = Path(__file__).resolve().parents[1] / "exportflow.db"


def make_engine(db_path: Path):
    return create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        echo=False,
    )


engine = make_engine(DB_PATH)


def init_db() -> None:
    import app.models  # noqa: F401  # 触发表模型注册

    SQLModel.metadata.create_all(engine)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
