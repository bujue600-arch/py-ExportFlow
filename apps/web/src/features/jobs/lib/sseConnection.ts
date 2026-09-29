/**
 * SSE 连接状态机（sse-events.md §4–5 / bullet ① 的核心实现）。
 *
 * 三态生命周期：
 *   connecting → connected ──断连──→ 阶梯退避重连（1/2/5/10s 封顶）
 *        ↑                          │连续失败 3 次
 *        └────online 恢复/重连成功──┴──→ degraded（轮询：前台 3s / 后台 15s）
 *
 * 页面生命周期：visibilitychange hidden → 主动断连停一切；visible → 全新连接。
 * 全程无需用户刷新页面。
 *
 * 可测试性：EventSource 工厂与可见性查询均可注入（FakeEventSource + 假时钟驱动）。
 */

import type { JobEventData, SnapshotData } from "../types";

export type SsePhase = "idle" | "connecting" | "connected" | "degraded";

export interface EventSourceLike {
  readonly readyState: number;
  close(): void;
  addEventListener(type: string, listener: (ev: { data?: string }) => void): void;
  onopen: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

export interface SseConnectionDeps {
  url: string;
  createEventSource?: (url: string) => EventSourceLike;
  /** 降级轮询的数据获取（上层用 refetch/invalidate 实现）。 */
  pollActive?: () => Promise<unknown>;
  getVisibility?: () => "visible" | "hidden";
  onEvent?: (data: JobEventData) => void;
  onSnapshot?: (data: SnapshotData) => void;
  onPhaseChange?: (phase: SsePhase) => void;
}

export const BACKOFF_STEPS_MS = [1_000, 2_000, 5_000, 10_000];
export const DEGRADE_AFTER_FAILURES = 3;
export const POLL_FOREGROUND_MS = 3_000;
export const POLL_BACKGROUND_MS = 15_000;

const defaultCreateEventSource = (url: string): EventSourceLike =>
  new EventSource(url) as unknown as EventSourceLike;

function defaultGetVisibility(): "visible" | "hidden" {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return "hidden";
  }
  return "visible";
}

export interface SseConnection {
  start(): void;
  stop(): void;
  getPhase(): SsePhase;
}

export function createSseConnection(deps: SseConnectionDeps): SseConnection {
  const createES = deps.createEventSource ?? defaultCreateEventSource;
  const pollActive = deps.pollActive ?? (async () => undefined);
  const getVisibility = deps.getVisibility ?? defaultGetVisibility;

  let phase: SsePhase = "idle";
  let es: EventSourceLike | null = null;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let running = false; // stop() 后为 false；页面隐藏暂停时为 true（可恢复）

  function setPhase(next: SsePhase): void {
    phase = next;
    deps.onPhaseChange?.(next);
  }

  function clearTimers(): void {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function closeEs(): void {
    es?.close();
    es = null;
  }

  function connect(): void {
    setPhase("connecting");
    const source = createES(deps.url);
    es = source;
    source.onopen = () => {
      failures = 0;
      stopPolling();
      setPhase("connected");
    };
    source.onerror = () => handleDrop();
    source.addEventListener("job_updated", (ev) => {
      if (typeof ev.data === "string") deps.onEvent?.(JSON.parse(ev.data));
    });
    source.addEventListener("snapshot", (ev) => {
      if (typeof ev.data === "string") deps.onSnapshot?.(JSON.parse(ev.data));
    });
    source.addEventListener("bye", () => handleDrop());
  }

  function handleDrop(): void {
    closeEs();
    failures += 1;
    // 第 3 次连续失败进入降级（轮询启动），但 SSE 重连不放弃：
    // 继续按 5s/10s 退避重试，一旦重连成功自动升级（onopen 停轮询）。
    if (failures >= DEGRADE_AFTER_FAILURES && phase !== "degraded") {
      degrade();
    } else if (phase !== "degraded") {
      setPhase("connecting");
    }
    const delay = BACKOFF_STEPS_MS[Math.min(failures - 1, BACKOFF_STEPS_MS.length - 1)];
    retryTimer = setTimeout(connect, delay);
  }

  function degrade(): void {
    setPhase("degraded");
    startPolling();
    void pollActive(); // 降级立即拉一次，不等第一个间隔
  }

  function startPolling(): void {
    stopPolling();
    const interval =
      getVisibility() === "hidden" ? POLL_BACKGROUND_MS : POLL_FOREGROUND_MS;
    pollTimer = setInterval(() => void pollActive(), interval);
  }

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function onOnline(): void {
    if (phase === "degraded") {
      failures = 0;
      stopPolling();
      connect(); // 网络恢复：自动升级回 SSE
    }
  }

  function onVisibilityChange(): void {
    if (getVisibility() === "hidden") {
      // 页面隐藏：主动断连省资源，停掉一切定时器
      closeEs();
      clearTimers();
      setPhase("idle");
    } else if (running && phase === "idle") {
      failures = 0;
      connect(); // 回前台：全新连接（视为一次普通重连）
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      if (typeof window !== "undefined") {
        window.addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
      connect();
    },
    stop() {
      running = false;
      closeEs();
      clearTimers();
      setPhase("idle");
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    },
    getPhase: () => phase,
  };
}
