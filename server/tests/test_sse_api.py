"""SSE 通道协议测试：首连 snapshot、Last-Event-ID 重放、窗口外回退（sse-events.md §3–4）。

说明：当前栈的 TestClient 对无限流式响应会缓冲挂起，因此不走 HTTP，
直接调用端点函数消费其异步生成器——对「协议输出」的断言反而更精确。
HTTP 层的流式传输在 D7 用真实 uvicorn 做端到端验证。
"""

from __future__ import annotations

import asyncio
import json

from app.api.events import events
from fastapi.testclient import TestClient
from sqlmodel import Session


class FakeRequest:
    async def is_disconnected(self) -> bool:
        return True  # 读到目标块后即可退出循环


def first_block(db_session: Session, last_event_id: str | None = None) -> dict[str, str]:
    async def run() -> dict[str, str]:
        response = await events(
            request=FakeRequest(),  # type: ignore[arg-type]
            last_event_id=last_event_id,
            db=db_session,
        )
        chunks: list[str] = []
        async for chunk in response.body_iterator:  # type: ignore[union-attr]
            chunks.append(chunk)
            break  # 只取第一个事件块
        await response.body_iterator.aclose()  # type: ignore[union-attr]
        fields: dict[str, str] = {}
        for line in chunks[0].strip().splitlines():
            key, _, value = line.partition(": ")
            fields[key] = value
        return fields

    return asyncio.run(run())


def create_one(client: TestClient, key: str) -> None:
    resp = client.post(
        "/api/export-jobs",
        json={"mode": "SELECTED_IDS", "selected_ids": ["a1"], "format": "csv"},
        headers={"Idempotency-Key": key},
    )
    assert resp.json()["code"] == 0


def test_首连_无LastEventID_先收snapshot(client: TestClient, db_session: Session) -> None:
    create_one(client, "k-sse-1")

    fields = first_block(db_session)

    assert fields["event"] == "snapshot"
    data = json.loads(fields["data"])
    assert len(data["jobs"]) == 1
    assert data["jobs"][0]["id"] in data["max_job_version_map"]


def test_重连_LastEventID在窗口内_重放缺失事件(client: TestClient, db_session: Session) -> None:
    create_one(client, "k-sse-2")  # 创建动作发布 seq=1 的 job_updated
    # 重连方声明只收到过 seq=0 → 应先收到 seq=1 的事件

    fields = first_block(db_session, last_event_id="0")

    assert fields["event"] == "job_updated"
    assert fields["id"] == "1"
    assert json.loads(fields["data"])["job_version"] == 1


def test_重连_窗口滑出_回退snapshot(client: TestClient, db_session: Session) -> None:
    create_one(client, "k-sse-3")
    from app.services.event_bus import bus

    bus._log.popleft()  # 模拟窗口滑动：创建事件已被挤出窗口

    fields = first_block(db_session, last_event_id="0")

    assert fields["event"] == "snapshot"
