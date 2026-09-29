/**
 * SSE 连接状态机集成测试（sse-events.md §6 的场景集，FakeEventSource + 假时钟）。
 * 场景编号即契约里的 1–9。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "../FakeEventSource";
import {
  BACKOFF_STEPS_MS,
  createSseConnection,
  type SseConnectionDeps,
} from "../sseConnection";

function makeDeps(overrides: Partial<SseConnectionDeps> = {}) {
  const deps: SseConnectionDeps = {
    url: "http://test/api/events",
    createEventSource: (url) => new FakeEventSource(url),
    pollActive: vi.fn().mockResolvedValue(undefined),
    getVisibility: () => "visible",
    onEvent: vi.fn(),
    onSnapshot: vi.fn(),
    onPhaseChange: vi.fn(),
    ...overrides,
  };
  return deps;
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("场景1：连接成功与事件派发", () => {
  it("open后进入connected_job_updated派发给onEvent", () => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();

    FakeEventSource.instances[0].simulateOpen();
    expect(deps.onPhaseChange).toHaveBeenCalledWith("connected");

    FakeEventSource.instances[0].emit("job_updated", {
      job_id: "j1", job_version: 2, status: "RUNNING", progress: 40,
      total_count: 100, processed_count: 40,
    });

    expect(deps.onEvent).toHaveBeenCalledWith(expect.objectContaining({ job_version: 2 }));
    conn.stop();
  });

  it("snapshot事件派发给onSnapshot_bye视同断连", () => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();
    const es = FakeEventSource.instances[0];
    es.simulateOpen();

    es.emit("snapshot", { jobs: [], max_job_version_map: {} });
    expect(deps.onSnapshot).toHaveBeenCalledTimes(1);

    es.emitBye();
    expect(es.closed).toBe(true); // 视同断连：主动关闭并走重连路径
    conn.stop();
  });
});

describe("场景4：阶梯退避 1/2/5/10 秒封顶", () => {
  it.each([
    [1, BACKOFF_STEPS_MS[0]],
    [2, BACKOFF_STEPS_MS[1]],
    [3, BACKOFF_STEPS_MS[2]],
    [4, BACKOFF_STEPS_MS[3]],
    [5, BACKOFF_STEPS_MS[3]],
  ])("第 %i 次失败后 %ims 重连（封顶后不再增长）", (failure, delay) => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();

    for (let i = 0; i < failure; i++) {
      FakeEventSource.instances.at(-1)!.simulateError();
      if (i < failure - 1) {
        vi.advanceTimersByTime(BACKOFF_STEPS_MS[Math.min(i, 3)]);
      }
    }
    // 退避期内不应新建连接
    vi.advanceTimersByTime(delay - 1);
    expect(FakeEventSource.instances.length).toBe(failure); // start 1 + (failure-1) 次重连
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances.length).toBe(failure + 1);
    conn.stop();
  });
});

describe("场景5/6：连续 3 次失败降级轮询（前台 3s / 后台 15s）", () => {
  it("前台_3秒间隔调用pollActive", () => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();

    for (let i = 0; i < 3; i++) {
      FakeEventSource.instances.at(-1)!.simulateError();
      if (i < 2) vi.advanceTimersByTime(BACKOFF_STEPS_MS[i]);
    }

    expect(deps.onPhaseChange).toHaveBeenCalledWith("degraded");
    expect(deps.pollActive).toHaveBeenCalledTimes(1); // 降级立即拉一次
    vi.advanceTimersByTime(3_000);
    expect(deps.pollActive).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3_000);
    expect(deps.pollActive).toHaveBeenCalledTimes(3);
    conn.stop();
  });

  it("后台_15秒间隔", () => {
    const deps = makeDeps({ getVisibility: () => "hidden" });
    const conn = createSseConnection(deps);
    conn.start();

    for (let i = 0; i < 3; i++) {
      FakeEventSource.instances.at(-1)!.simulateError();
      if (i < 2) vi.advanceTimersByTime(BACKOFF_STEPS_MS[i]);
    }

    vi.advanceTimersByTime(14_999);
    expect(deps.pollActive).toHaveBeenCalledTimes(1); // 仅降级时立即那次
    vi.advanceTimersByTime(1);
    expect(deps.pollActive).toHaveBeenCalledTimes(2);
    conn.stop();
  });
});

describe("场景7：network online 自动升级回 SSE", () => {
  it("degraded时online_停轮询重建连接", () => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();
    for (let i = 0; i < 3; i++) {
      FakeEventSource.instances.at(-1)!.simulateError();
      if (i < 2) vi.advanceTimersByTime(BACKOFF_STEPS_MS[i]);
    }
    const pollCalls = (deps.pollActive as ReturnType<typeof vi.fn>).mock.calls.length;

    window.dispatchEvent(new Event("online"));

    expect(FakeEventSource.instances.length).toBe(4); // 新建了第 4 个连接
    FakeEventSource.instances.at(-1)!.simulateOpen();
    expect(deps.onPhaseChange).toHaveBeenCalledWith("connected");
    vi.advanceTimersByTime(60_000);
    expect((deps.pollActive as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pollCalls); // 轮询已停
    conn.stop();
  });
});

describe("场景8：页面隐藏主动断连、回前台恢复", () => {
  it("hidden_关闭连接与定时器_visible_全新连接", () => {
    let visibility: "visible" | "hidden" = "visible";
    const deps = makeDeps({ getVisibility: () => visibility });
    const conn = createSseConnection(deps);
    conn.start();
    const es = FakeEventSource.instances[0];
    es.simulateOpen();

    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(es.closed).toBe(true);
    expect(conn.getPhase()).toBe("idle");
    vi.advanceTimersByTime(60_000);
    expect(FakeEventSource.instances.length).toBe(1); // 无重连无轮询

    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(FakeEventSource.instances.length).toBe(2); // 全新连接
    FakeEventSource.instances.at(-1)!.simulateOpen();
    expect(conn.getPhase()).toBe("connected");
    conn.stop();
  });
});

describe("生命周期清理", () => {
  it("stop后_无任何定时器泄漏_可重新start", () => {
    const deps = makeDeps();
    const conn = createSseConnection(deps);
    conn.start();
    FakeEventSource.instances[0].simulateOpen();
    conn.stop();

    expect(FakeEventSource.instances[0].closed).toBe(true);
    vi.advanceTimersByTime(120_000);
    expect(deps.onEvent).not.toHaveBeenCalled();
    expect(deps.pollActive).not.toHaveBeenCalled();

    conn.start();
    expect(FakeEventSource.instances.length).toBe(2);
    conn.stop();
  });
});
