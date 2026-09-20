"""事件总线单元测试：seq 单调、订阅扇出、重放窗口（sse-events.md §2–3）。"""

from app.services.event_bus import EventBus


def test_publish_seq_单调递增() -> None:
    bus = EventBus()

    assert bus.publish("job_updated", {}) == 1
    assert bus.publish("job_updated", {}) == 2
    assert bus.publish("bye", {}) == 3


def test_订阅者在publish后收到事件() -> None:
    bus = EventBus()
    _, queue = bus.subscribe()

    bus.publish("job_updated", {"job_id": "j1", "job_version": 2})
    item = queue.get_nowait()

    assert item.event == "job_updated"
    assert item.data["job_version"] == 2


def test_重放_返回严格晚于last_seq的事件() -> None:
    bus = EventBus()
    bus.publish("job_updated", {"n": 1})
    bus.publish("job_updated", {"n": 2})
    bus.publish("job_updated", {"n": 3})

    replay = bus.replay_after(1)

    assert [item.data["n"] for item in replay] == [2, 3]


def test_窗口滑出后_重放为空且提示转snapshot() -> None:
    bus = EventBus()
    for i in range(3):
        bus.publish("job_updated", {"n": i})
    bus._log.popleft()  # 模拟窗口滑动：最老事件被挤掉

    assert bus.window_exceeded(0) is True
    assert bus.replay_after(0) == []
