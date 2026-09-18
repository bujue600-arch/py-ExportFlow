/**
 * 统一请求层（api-contract.md §1–2、架构方案 §5）——项目里唯一允许发 fetch 的地方。
 *
 * 职责：
 * 1. 信封结构校验：形状不对按 5000 处理（防御后端异常出口漏包）；
 * 2. 错误归一化：业务错误（code≠0）、HTTP 错误、二进制错误体 → 统一 ApiError；
 * 3. 幂等键生成（创建导出用，D4）。
 *
 * UI 层永远只面对 ApiError 一种错误形状。
 */

export class ApiError extends Error {
  readonly code: number;
  readonly traceId: string;

  constructor(code: number, message: string, traceId: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.traceId = traceId;
  }

  /** 报障文案：把 trace_id 透给用户，凭它可串联前后端日志（bullet ③）。 */
  toUserMessage(): string {
    return `${this.message}（trace_id: ${this.traceId}）`;
  }
}

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

interface Envelope {
  code: number;
  message: string;
  data: unknown;
  trace_id: string;
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === "number" &&
    typeof v.message === "string" &&
    typeof v.trace_id === "string" &&
    "data" in v
  );
}

function fallbackError(status: number, traceId: string): ApiError {
  return new ApiError(status >= 500 ? 5000 : 1001, `请求失败（${status}）`, traceId);
}

/** JSON 请求：成功返回 data 本体；任何失败抛 ApiError。 */
export async function request<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.idempotencyKey) {
    headers.set("Idempotency-Key", init.idempotencyKey);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const traceId = res.headers.get("X-Trace-Id") ?? "";
  const body: unknown = await res.json().catch(() => null);

  if (!isEnvelope(body)) {
    // 响应不是信封：后端异常出口漏包或网关错误，按兜底处理
    throw fallbackError(res.status, traceId);
  }
  if (!res.ok || body.code !== 0) {
    throw new ApiError(body.code, body.message, body.trace_id);
  }
  return body.data as T;
}

/**
 * 二进制下载（bullet ③「二进制错误体解析」）：
 * 成功返回 Blob；失败时响应体是信封 JSON，读 text 再解析回 ApiError。
 */
export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (res.ok) {
    return res.blob();
  }
  const traceId = res.headers.get("X-Trace-Id") ?? "";
  const text = await res.text();
  try {
    const body: unknown = JSON.parse(text);
    if (isEnvelope(body)) {
      throw new ApiError(body.code, body.message, body.trace_id);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }
  throw fallbackError(res.status, traceId);
}

/** 生成幂等键（uuid v4）。同一「创建导出意图」内复用，重试不换号（D4 使用）。 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
