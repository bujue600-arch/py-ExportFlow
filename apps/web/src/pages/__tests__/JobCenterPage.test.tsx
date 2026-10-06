import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { ApiError, requestWithTrace } from "../../api/client";
import JobCenterPage from "../JobCenterPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/client")>(), requestWithTrace: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><JobCenterPage /></QueryClientProvider>);
}

describe("JobCenterPage", () => {
  beforeEach(() => { vi.mocked(requestWithTrace).mockReset(); });

  it("test_获取任务_有任务_显示卡片和分页", async () => {
    vi.mocked(requestWithTrace).mockResolvedValue({ data: { items: [{
      id: "job_1", status: "DONE", format: "csv", total_count: 2, processed_count: 2,
      progress: 100, job_version: 3, created_at: "2026-10-02T10:00:00Z", finished_at: null,
      file: { name: "export.csv", size_bytes: 20 }, error: null,
    }], total: 11, page: 1, page_size: 10 }, traceId: "trace-jobs" });

    renderPage();

    expect(await screen.findByText("已完成")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("第 1 / 2 页 · 共 11 条");
    expect(requestWithTrace).toHaveBeenCalledWith("/api/export-jobs?page=1&page_size=10", { signal: expect.any(AbortSignal) });
  });

  it("test_获取任务_统一错误_显示trace_id", async () => {
    const error = new ApiError(5000, "请求失败", "trace-jobs-error");
    vi.mocked(requestWithTrace).mockRejectedValue(error);

    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("请求失败（trace_id: trace-jobs-error）"));
  });
});
