/** 导出意图测试：同一意图重试复用同一幂等键（bullet ④ 的提交侧）。 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createExportIntent } from "../exportSubmit";

const okEnvelope = (data: unknown) => ({ code: 0, message: "ok", data, trace_id: "t-1" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createExportIntent", () => {
  it("重试_同一意图两次提交_幂等键不变", async () => {
    // 注意：Response body 只能读一次，mock 必须每次调用都新建（重试场景两次请求）
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(okEnvelope({ id: "job_x", status: "QUEUED", job_version: 1 })),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const intent = createExportIntent();
    const payload = { mode: "SELECTED_IDS" as const, selected_ids: ["a1"] };
    await intent.submit(payload, "csv");
    await intent.submit(payload, "csv"); // 模拟网络层重试

    const keys = fetchMock.mock.calls.map(([, init]) =>
      new Headers((init as RequestInit).headers).get("Idempotency-Key"),
    );
    expect(keys).toEqual([intent.key, intent.key]);
  });

  it("不同意图_幂等键不同", () => {
    expect(createExportIntent().key).not.toBe(createExportIntent().key);
  });
});
