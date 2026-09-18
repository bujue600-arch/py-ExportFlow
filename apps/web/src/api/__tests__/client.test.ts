/** 统一请求层测试：成功解包 / 业务错误 / HTTP 错误 / 坏形状兜底 / 二进制错误体。 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, requestBlob } from "../client";

const okEnvelope = (data: unknown) => ({
  code: 0, message: "ok", data, trace_id: "t-1",
});

function jsonResponse(status: number, body: unknown, traceId = "t-1"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "X-Trace-Id": traceId },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("成功_解包_data本体", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, okEnvelope({ items: [1, 2] }))));

    const data = await request<{ items: number[] }>("/api/assets");

    expect(data).toEqual({ items: [1, 2] });
  });

  it("业务错误_code非0_抛ApiError携带traceId", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400, {
      code: 3001, message: "导出超上限", data: { limit: 1000, total: 5000 }, trace_id: "t-err",
    })));

    const err = await request("/api/export-jobs", { method: "POST" }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(3001);
    expect((err as ApiError).traceId).toBe("t-err");
    expect((err as ApiError).toUserMessage()).toContain("t-err");
  });

  it("HTTP_500_但信封规范_仍按信封错误归一", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, {
      code: 5000, message: "服务器内部错误", data: null, trace_id: "t-500",
    })));

    const err = await request("/api/x").catch((e: unknown) => e);

    expect((err as ApiError).code).toBe(5000);
    expect((err as ApiError).traceId).toBe("t-500");
  });

  it("响应不是信封_兜底5000_不直接抛语法错误", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("<html>Bad Gateway</html>", { status: 502, headers: { "X-Trace-Id": "t-bg" } }),
    ));

    const err = await request("/api/x").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(5000);
    expect((err as ApiError).message).toContain("502");
  });

  it("idempotencyKey_注入请求头", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, okEnvelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await request("/api/export-jobs", { method: "POST", idempotencyKey: "key-1" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("key-1");
  });
});

describe("requestBlob（二进制错误体解析，bullet ③）", () => {
  it("成功_返回Blob内容完整", async () => {
    // 注：jsdom 与 Node 各有一个 Blob 全局类，混用会坏数据；
    // 用字符串构造 Response，按 size 断言（跨 realm 兼容）。
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("a,b,c", { status: 200, headers: { "Content-Type": "text/csv" } }),
    ));

    const blob = await requestBlob("/api/export-jobs/j1/download");

    expect(blob.size).toBe(5);
    expect(blob.type).toBe("text/csv");
  });

  it("失败_响应体是信封JSON_解析回ApiError", async () => {
    // 下载失败：HTTP 409，body 不是文件而是信封 JSON（api-contract §5 双形状）
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(409, {
      code: 2002, message: "任务尚未完成", data: null, trace_id: "t-dl",
    })));

    const err = await requestBlob("/api/export-jobs/j1/download").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(2002);
    expect((err as ApiError).traceId).toBe("t-dl");
  });

  it("失败_响应体不是JSON_按状态兜底", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("garbage", { status: 500, headers: { "X-Trace-Id": "t-g" } }),
    ));

    const err = await requestBlob("/api/export-jobs/j1/download").catch((e: unknown) => e);

    expect((err as ApiError).code).toBe(5000);
  });
});
