"""统一时钟：全项目一律用 aware UTC。

为什么必须带时区：新版 SQLModel 对 datetime 列在绑定时强制校验 tzinfo，
naive datetime 直接抛 ValueError（CI 踩过）。比较/运算全在 aware 之间进行。
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
