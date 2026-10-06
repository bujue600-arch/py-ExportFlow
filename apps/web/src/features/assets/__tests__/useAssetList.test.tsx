import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { ApiError, request } from "../../../api/client";
import { useAssetList } from "../hooks/useAssetList";
import { assetListKey } from "../keys";
import { defaultFilter } from "../lib/filter";
import { mockAssets } from "../mock";
import type { AssetListResponse } from "../types";

vi.mock("../../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../api/client")>(), request: vi.fn(),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

function response(page = 1): AssetListResponse {
  return { items: structuredClone(mockAssets), total: 42, page, page_size: 20 };
}

describe("useAssetList", () => {
  beforeEach(() => { vi.mocked(request).mockReset(); });

  it("test_获取列表_请求成功_返回数据和总数", async () => {
    const data = response();
    vi.mocked(request).mockResolvedValue(data);

    const { result } = renderHook(() => useAssetList(1, 20, defaultFilter()), setup());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(data);
    expect(request).toHaveBeenCalledWith("/api/assets?page=1&page_size=20",
      { signal: expect.any(AbortSignal) });
  });

  it("test_获取列表_统一错误_保留message和traceId且不重试", async () => {
    const error = new ApiError(1001, "分页参数非法", "trace-list-error");
    vi.mocked(request).mockRejectedValue(error);

    const { result } = renderHook(() => useAssetList(1, 20, defaultFilter()), setup());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(result.current.error).toMatchObject({ message: "分页参数非法", traceId: "trace-list-error" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("test_序列化_有筛选和日期_发送契约参数", async () => {
    vi.mocked(request).mockResolvedValue(response(2));
    const filter = { ...defaultFilter(), keyword: " 城市 & 光影 ", assetType: "video" as const,
      status: "ready" as const, tag: " 旅行 ", createdFrom: "2026-09-01", createdTo: "2026-09-30" };

    renderHook(() => useAssetList(2, 20, filter), setup());

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const params = new URL(vi.mocked(request).mock.calls[0][0], "http://localhost").searchParams;
    expect(Object.fromEntries(params)).toEqual({ page: "2", page_size: "20", keyword: "城市 & 光影",
      asset_type: "video", status: "ready", tag: "旅行", created_from: "2026-09-01T00:00:00",
      created_to: "2026-09-30T23:59:59" });
  });

  it("test_缓存标识_分页或筛选改变_隔离请求缓存", () => {
    const filter = defaultFilter();

    const key = assetListKey(1, 20, filter);

    expect(key).not.toEqual(assetListKey(2, 20, filter));
    expect(key).not.toEqual(assetListKey(1, 10, filter));
    expect(key).not.toEqual(assetListKey(1, 20, { ...filter, assetType: "video" }));
    expect(key).toEqual(assetListKey(1, 20, { ...filter, keyword: "  " }));
  });

  it("test_切换条件_旧响应较晚_取消旧请求且保留新结果", async () => {
    let resolveOld!: (data: AssetListResponse) => void;
    vi.mocked(request).mockReturnValueOnce(new Promise<AssetListResponse>((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ ...response(), items: [mockAssets[1]], total: 1 });
    const { result, rerender } = renderHook(({ filter }) => useAssetList(1, 20, filter), {
      ...setup(), initialProps: { filter: defaultFilter() },
    });
    const oldSignal = vi.mocked(request).mock.calls[0][1]?.signal;

    rerender({ filter: { ...defaultFilter(), assetType: "video" } });
    await waitFor(() => expect(result.current.data?.total).toBe(1));
    await act(async () => { resolveOld(response()); });

    expect(oldSignal?.aborted).toBe(true);
    expect(result.current.data?.items).toEqual([mockAssets[1]]);
    expect(result.current.data?.total).toBe(1);
  });
});
