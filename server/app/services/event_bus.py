"""进程内 SSE 事件总线（sse-events.md §1–3）。

三件事：
- 全局事件日志（seq 单调递增）——Last-Event-ID 重放的数据来源，窗口外由端点发 snapshot；
- 订阅者各自一条 asyncio.Queue，publish 即扇出；
- 重放窗口：保留最近 WINDOW 条（D6 前端重连时若早于窗口起点则走 snapshot 校准）。

教学说明：这是单进程实现（课程范围）。换成 Redis pub/sub 或 Kafka 时，"日志重放 +
订阅"这两步换成中间件，端点协议不变——协议先于实现，这就是契约的价值。
"""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass


@dataclass
class SseEvent:
    seq: int
    event: str  # job_updated | snapshot | bye
    data: dict


WINDOW = 512


class EventBus:
    def __init__(self) -> None:
        self._log: deque[SseEvent] = deque(maxlen=WINDOW)
        self._subscribers: dict[int, asyncio.Queue] = {}
        self._next_sub_id = 0
        self._seq = 0

    def publish(self, event: str, data: dict) -> int:
        self._seq += 1
        item = SseEvent(seq=self._seq, event=event, data=data)
        self._log.append(item)
        for queue in self._subscribers.values():
            queue.put_nowait(item)
        return item.seq

    def subscribe(self) -> tuple[int, asyncio.Queue]:
        self._next_sub_id += 1
        sub_id = self._next_sub_id
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers[sub_id] = queue
        return sub_id, queue

    def unsubscribe(self, sub_id: int) -> None:
        self._subscribers.pop(sub_id, None)

    def replay_after(self, last_seq: int) -> list[SseEvent]:
        """返回 seq 严格大于 last_seq 的窗口内事件；早于窗口起点时返回 None（调用方转 snapshot）。"""
        if not self._log:
            return []
        if last_seq < self._log[0].seq - 1:
            return []  # 已滑出窗口：返回空让端点发 snapshot
        return [item for item in self._log if item.seq > last_seq]

    def window_exceeded(self, last_seq: int) -> bool:
        return bool(self._log) and last_seq < self._log[0].seq - 1

    def reset(self) -> None:
        """仅供测试：清空全局状态。"""
        self._log.clear()
        self._subscribers.clear()
        self._seq = 0
        self._next_sub_id = 0


bus = EventBus()
