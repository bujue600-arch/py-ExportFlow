/**
 * 手写 FakeEventSource（bullet ② 的测试基建）。
 *
 * 为什么需要它：SSE 状态机的时序行为（退避/降级/升级）依赖真实 EventSource 的
 * 断连时机，集成测试里不可能等真的断网——用假的事件源在测试里精确"导演"
 *每一次断连与重放，配合 vitest 假时钟实现确定性验证。
 */

import type { EventSourceLike } from "./sseConnection";

export class FakeEventSource implements EventSourceLike {
  /** 所有实例按创建顺序留档，测试借此断言"何时新建了连接"。 */
  static instances: FakeEventSource[] = [];

  readonly url: string;
  readyState = 0; // 0 connecting / 1 open / 2 closed
  closed = false;
  onopen: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;

  private listeners = new Map<string, Set<(ev: { data?: string }) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (ev: { data?: string }) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  // ---- 测试驱动 API（仅测试使用）----

  simulateOpen(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  simulateError(): void {
    this.onerror?.({});
  }

  emit(type: "job_updated" | "snapshot", data: unknown): void {
    const event = { data: JSON.stringify(data) };
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  emitBye(): void {
    for (const listener of this.listeners.get("bye") ?? []) {
      listener({});
    }
  }

  static reset(): void {
    FakeEventSource.instances = [];
  }
}
