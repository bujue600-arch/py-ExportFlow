import { fireEvent, render, screen } from "@testing-library/react";
import { defaultFilter } from "../../features/assets/lib/filter";
import AssetListPage from "../AssetListPage";

describe("AssetListPage 静态列表", () => {
  afterEach(() => vi.restoreAllMocks());

  it("test_打开作品库_初始状态_显示筛选和十二条数据", () => {
    render(<AssetListPage />);

    const table = screen.getByRole("table", { name: "作品列表" });

    expect(screen.getByRole("heading", { name: "作品库" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "筛选作品" })).toBeInTheDocument();
    expect(table.querySelectorAll("tbody tr")).toHaveLength(12);
  });

  it("test_查询_填写全部筛选字段_仅提交时打印当前条件", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AssetListPage />);

    fireEvent.change(screen.getByLabelText("关键词"), { target: { value: "城市" } });
    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "image" } });
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "ready" } });
    fireEvent.change(screen.getByLabelText("标签"), { target: { value: "风景" } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2026-09-30" } });

    expect(log).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({ keyword: "城市", assetType: "image",
      status: "ready", tag: "风景", createdFrom: "2026-09-01", createdTo: "2026-09-30" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(12);
  });

  it("test_重置_已填写表单_清空所有条件且不自动提交", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    render(<AssetListPage />);
    for (const [label, value] of [["关键词", "城市"], ["类型", "video"], ["状态", "failed"],
      ["标签", "旅行"], ["开始日期", "2026-09-01"], ["结束日期", "2026-09-30"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }

    fireEvent.click(screen.getByRole("button", { name: "重置" }));

    for (const label of ["关键词", "类型", "状态", "标签", "开始日期", "结束日期"]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
    expect(log).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(defaultFilter());
  });
});
