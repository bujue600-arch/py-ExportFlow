"""导出任务表模型（api-contract.md §5、selection-payload.md）。

队列设计（教学级轻量实现）：
- 不引入消息中间件，任务表即队列：worker 以「抢占 + 租约」方式领取；
- lease_until 到期仍 RUNNING 的任务视为卡死，可被重新抢占；
- job_version 由 service 层单一入口递增（RULES-backend #8），禁止直接改字段。
"""

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from app.core.clock import utcnow

JOB_QUEUED = "QUEUED"
JOB_RUNNING = "RUNNING"
JOB_DONE = "DONE"
JOB_FAILED = "FAILED"
ACTIVE_STATUSES = (JOB_QUEUED, JOB_RUNNING)


class ExportJob(SQLModel, table=True):
    __tablename__ = "export_job"

    id: str = Field(primary_key=True)
    status: str = Field(default=JOB_QUEUED, index=True)
    format: str  # csv | json
    mode: str  # SELECTED_IDS | FILTER
    selected_ids: list | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    filter: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    excluded_ids: list | None = Field(default=None, sa_column=Column(JSON, nullable=True))

    idempotency_key: str = Field(unique=True, index=True)
    payload_hash: str

    total_count: int = Field(default=0)
    processed_count: int = Field(default=0)
    progress: int = Field(default=0)
    job_version: int = Field(default=1)

    file_name: str | None = None
    file_size: int | None = None
    error_code: str | None = None
    error_message: str | None = None

    lease_until: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow, index=True)
    finished_at: datetime | None = None
