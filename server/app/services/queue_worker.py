"""进程内队列 worker：循环「抢占 → 执行 → 异常兜底」。

教学说明：
- 单进程实现，任务表即队列（无中间件依赖）；
- run_once 是纯同步函数，测试可直接调用（确定性）；循环只在服务运行时存在；
- EXPORTFLOW_WORKER=0 可关闭（测试用）。
"""

from __future__ import annotations

import asyncio
import logging

from app.db import engine
from app.repositories import job_repo
from app.services import export_runner, job_service
from sqlmodel import Session

logger = logging.getLogger("app.worker")


def run_once(session: Session) -> bool:
    """领取并执行一个任务；无任务返回 False。异常兜底为 3003（契约 §2）。"""
    job = job_service.claim_next(session)
    if job is None:
        return False
    try:
        export_runner.execute_export(session, job)
    except Exception as exc:
        logger.exception("导出执行异常 job=%s", job.id)
        session.rollback()
        fresh = job_repo.get(session, job.id)
        if fresh is not None:
            job_service.fail_job(session, fresh, 3003, f"导出执行异常：{type(exc).__name__}")
    return True


class QueueWorker:
    def __init__(self, interval: float = 1.0) -> None:
        self.interval = interval
        self._task: asyncio.Task | None = None

    async def _loop(self) -> None:
        while True:
            with Session(engine) as session:
                run_once(session)
            await asyncio.sleep(self.interval)

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.get_running_loop().create_task(self._loop())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
