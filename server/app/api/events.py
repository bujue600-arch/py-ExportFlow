"""SSE 事件通道（sse-events.md 全文）。

连接协议：
- 无 Last-Event-ID 或已滑出重放窗口 → 先发 snapshot（全量校准）；
- Last-Event-ID 在窗口内 → 重放缺失事件；
- 之后持续推送；每 15 秒注释行 :ping 心跳；断开即退订。
"""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.core.envelope import EnvelopeRoute
from app.db import get_db
from app.services import job_service
from app.services.event_bus import SseEvent, bus

# 见 jobs.py 注释：子路由器必须显式声明信封路由类（非 JSON 响应会直通）。
router = APIRouter(route_class=EnvelopeRoute)

HEARTBEAT_SECONDS = 15.0


def format_event(item: SseEvent) -> str:
    data = json.dumps(item.data, ensure_ascii=False)
    return f"event: {item.event}\nid: {item.seq}\ndata: {data}\n\n"


@router.get("/events")
async def events(
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    async def stream():
        sub_id, queue = bus.subscribe()
        try:
            replay: list[SseEvent] | None = None
            if (
                last_event_id is not None
                and last_event_id.isdigit()
                and not bus.window_exceeded(int(last_event_id))
            ):
                replay = bus.replay_after(int(last_event_id))
            if replay:
                for item in replay:
                    yield format_event(item)
            else:
                payload = json.dumps(job_service.snapshot(db), ensure_ascii=False)
                yield f"event: snapshot\ndata: {payload}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue
                yield format_event(item)
        finally:
            bus.unsubscribe(sub_id)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
