import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { requestWithTrace } from "../../../api/client";
import { useJobs } from "../hooks/useJobs";

vi.mock("../../../api/client", () => ({ requestWithTrace: vi.fn() }));

it("test_SSE接管后_挂载只请求一次_不再启动固定轮询", async () => {
  vi.useFakeTimers();
  vi.mocked(requestWithTrace).mockResolvedValue({
    data: { items: [], total: 0, page: 2, page_size: 10 }, traceId: "trace-poll",
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { unmount } = renderHook(() => useJobs({ page: 2, pageSize: 10 }), { wrapper });

  try {
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(requestWithTrace).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(requestWithTrace).toHaveBeenCalledTimes(1);
    expect(requestWithTrace).toHaveBeenLastCalledWith("/api/export-jobs?page=2&page_size=10",
      { signal: expect.any(AbortSignal) });

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });

    expect(requestWithTrace).toHaveBeenCalledTimes(1);
  } finally {
    unmount();
    client.clear();
    vi.useRealTimers();
  }
});
