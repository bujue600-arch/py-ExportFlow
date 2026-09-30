import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError, request } from "../../api/client";
import { mockAssets } from "../../features/assets/mock";
import AssetListPage from "../AssetListPage";

vi.mock("../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../api/client")>(), request: vi.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><AssetListPage /></QueryClientProvider>);
}

function mockList() {
  vi.mocked(request).mockImplementation(async (path) => {
    const params = new URL(path, "http://localhost").searchParams;
    const page = Number(params.get("page"));
    const video = params.get("asset_type") === "video";
    return { items: [{ ...mockAssets[video ? 1 : 0], title: `第${page}页${video ? "视频" : "作品"}` }],
      total: video ? 21 : 42, page, page_size: 20 };
  });
}

describe("AssetListPage 真实查询", () => {
  beforeEach(() => { vi.mocked(request).mockReset(); });

  it("test_打开列表_请求未完成_显示加载提示", () => {
    vi.mocked(request).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("加载中…");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("test_打开列表_请求失败_展示message和trace_id", async () => {
    vi.mocked(request).mockRejectedValue(new ApiError(5000, "服务器内部错误", "trace-123"));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("服务器内部错误（trace_id: trace-123）");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("test_查询和翻页_编辑草稿_仅提交生效且翻页沿用已提交条件", async () => {
    mockList();
    renderPage();
    await screen.findByText("第1页作品");

    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "video" } });

    expect(request).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await screen.findByText("第1页视频");
    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "image" } });
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    await screen.findByText("第2页视频");
    expect(request).toHaveBeenLastCalledWith("/api/assets?page=2&page_size=20&asset_type=video",
      { signal: expect.any(AbortSignal) });
    expect(screen.getByRole("status")).toHaveTextContent("第 2 / 2 页 · 共 21 条");
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
  });

  it("test_提交新条件_当前第二页_回到第一页", async () => {
    mockList();
    renderPage();
    await screen.findByText("第1页作品");
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await screen.findByText("第2页作品");

    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "video" } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    await screen.findByText("第1页视频");
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(request).toHaveBeenLastCalledWith("/api/assets?page=1&page_size=20&asset_type=video",
      { signal: expect.any(AbortSignal) });
  });

  it("test_重置草稿_已提交视频条件_再次查询才清除请求条件", async () => {
    mockList();
    renderPage();
    await screen.findByText("第1页作品");
    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "video" } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await screen.findByText("第1页视频");

    fireEvent.click(screen.getByRole("button", { name: "重置" }));

    expect(screen.getByLabelText("类型")).toHaveValue("");
    expect(request).toHaveBeenCalledTimes(2);
    expect(screen.getByText("第1页视频")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    await screen.findByText("第1页作品");
    await waitFor(() => expect(request).toHaveBeenLastCalledWith("/api/assets?page=1&page_size=20",
      { signal: expect.any(AbortSignal) }));
  });

  it("test_查询_没有匹配作品_显示空态并禁用翻页", async () => {
    vi.mocked(request).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    renderPage();

    await screen.findByText("暂无作品");
    expect(screen.getByRole("status")).toHaveTextContent("第 1 / 1 页 · 共 0 条");
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
  });
});
