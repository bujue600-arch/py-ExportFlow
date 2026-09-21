"""统一时钟：全项目一律用 naive UTC，避免 aware/naive 比较错误。"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
