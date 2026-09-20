"""FastAPI 入口：应用工厂 + 中间件装配 + 异常处理器注册 + lifespan（建库/启停 worker）。

启动（仓库根目录）：
    python -m uvicorn app.main:app --reload --app-dir server
交互文档：http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api.health import router as health_router
from app.core.envelope import register_exception_handlers
from app.core.trace import TraceIdMiddleware, configure_logging
from app.db import init_db
from app.services.event_bus import bus
from app.services.queue_worker import QueueWorker

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    worker = QueueWorker()
    if os.environ.get("EXPORTFLOW_WORKER", "1") != "0":
        worker.start()  # 测试环境 EXPORTFLOW_WORKER=0 关闭，保证确定性
    app.state.worker = worker
    yield
    await worker.stop()
    bus.publish("bye", {"reason": "server_shutdown"})


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="ExportFlow", version="0.2.0", lifespan=lifespan)

    app.add_middleware(TraceIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Trace-Id"],
    )
    register_exception_handlers(app)

    app.include_router(health_router)  # 豁免信封
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
