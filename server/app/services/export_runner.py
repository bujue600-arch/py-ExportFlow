"""导出执行器（B-D4 实现，本文件是 A 留下的接线点/占位）。

B 落地时的约定：
- 函数签名保持 execute_export(session, job)；
- 进度上报只允许调 job_service.bump_and_publish(session, job, total_count=..., processed_count=..., progress=...)；
- 上限防御：SELECTED_IDS >1000 → fail_job(1002)；FILTER 命中-排除 >1000 → fail_job(3001)；
- 成功 → job_service.complete_job(...)。
"""

from app.models.export_job import ExportJob
from app.services import job_service
from sqlmodel import Session


def execute_export(session: Session, job: ExportJob) -> None:
    job_service.fail_job(session, job, 3003, "导出执行器尚未接入（等待 B-D4 实现）")
