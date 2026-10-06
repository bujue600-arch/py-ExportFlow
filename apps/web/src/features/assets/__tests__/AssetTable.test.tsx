import { fireEvent, render, screen, within } from "@testing-library/react";
import AssetTable from "../components/AssetTable";
import { mockAssets } from "../mock";

describe("AssetTable", () => {
  it("test_勾选行_父级传入选中ID_复选框与行标记同步且点击仅通知父级", () => {
    const assets = structuredClone(mockAssets);
    const selectedIds = new Set([assets[0].id]);
    const onToggleRow = vi.fn();
    render(<AssetTable assets={assets} selectedIds={selectedIds} onToggleRow={onToggleRow} />);
    const row = screen.getByRole("row", { name: /城市晨光/ });
    const checkbox = within(row).getByRole("checkbox");

    fireEvent.click(checkbox);

    expect(onToggleRow).toHaveBeenCalledTimes(1);
    expect(onToggleRow).toHaveBeenCalledWith(assets[0].id);
    expect(checkbox).toBeChecked();
    expect(row).toHaveAttribute("data-selected", "true");
    expect(selectedIds).toEqual(new Set([assets[0].id]));
    expect(screen.getAllByRole("row")[2]).toHaveAttribute("data-selected", "false");
  });

  it("test_表头三态_父级切换混合全选和未选_同步checked与indeterminate", () => {
    const assets = structuredClone(mockAssets);
    const onToggleRow = vi.fn();
    const { rerender } = render(<AssetTable assets={assets}
      selectedIds={new Set([assets[0].id])} onToggleRow={onToggleRow} />);
    const header = screen.getByRole("checkbox", { name: "选择本页全部作品" });

    expect(header).toBePartiallyChecked();
    expect(header).not.toBeChecked();

    rerender(<AssetTable assets={assets} selectedIds={new Set(assets.map((asset) => asset.id))}
      onToggleRow={onToggleRow} />);

    expect(header).toBeChecked();
    expect(header).not.toBePartiallyChecked();

    rerender(<AssetTable assets={assets} selectedIds={new Set()} onToggleRow={onToggleRow} />);

    expect(header).not.toBeChecked();
    expect(header).not.toBePartiallyChecked();
  });

  it.each(["none", "some", "all"])("test_点击表头_%s_仅切换本页需要改变的行", (state) => {
    const assets = structuredClone(mockAssets.slice(0, 3));
    const selectedIds = new Set(["other-page", ...assets.slice(0,
      state === "all" ? 3 : state === "some" ? 1 : 0).map((asset) => asset.id)]);
    const onToggleRow = vi.fn();
    render(<AssetTable assets={assets} selectedIds={selectedIds} onToggleRow={onToggleRow} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "选择本页全部作品" }));

    const expected = state === "some" ? assets.slice(1) : assets;
    expect(onToggleRow.mock.calls).toEqual(expected.map((asset) => [asset.id]));
    expect(selectedIds.has("other-page")).toBe(true);
  });

  it("test_表头三态_仅其他页有选中作品_本页保持未选", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} selectedIds={new Set(["other-page"])} onToggleRow={vi.fn()} />);

    const header = screen.getByRole("checkbox", { name: "选择本页全部作品" });
    expect(header).not.toBeChecked();
    expect(header).not.toBePartiallyChecked();
  });

  it("test_空列表_无可选行_表头未勾选且禁用并跨七列显示空态", () => {
    render(<AssetTable assets={[]} selectedIds={new Set(["other-page"])} onToggleRow={vi.fn()} />);

    const header = screen.getByRole("checkbox", { name: "选择本页全部作品" });

    expect(header).toBeDisabled();
    expect(header).not.toBeChecked();
    expect(header).not.toBePartiallyChecked();
    expect(screen.getByRole("cell", { name: "暂无作品" })).toHaveAttribute("colspan", "7");
  });

  it("test_渲染表格_十二条作品_显示十二行数据和七个表头", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} selectedIds={new Set()} onToggleRow={vi.fn()} />);

    expect(screen.getAllByRole("row").slice(1)).toHaveLength(12);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent))
      .toEqual(["", "标题", "类型", "状态", "标签", "大小", "创建时间"]);
  });

  it("test_显示徽章_混合类型状态_使用中文文案", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} selectedIds={new Set()} onToggleRow={vi.fn()} />);

    for (const label of ["图片", "视频", "剧本", "草稿", "就绪", "失败"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("test_显示大小_跨KB和MB_格式化字节值", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} selectedIds={new Set()} onToggleRow={vi.fn()} />);

    expect(screen.getByText("512.0 KB")).toBeInTheDocument();
    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
    expect(screen.queryByText("524288")).not.toBeInTheDocument();
    expect(screen.queryByText("1572864")).not.toBeInTheDocument();
  });

  it("test_显示作品详情_有标签和创建时间_保留对应内容", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} selectedIds={new Set()} onToggleRow={vi.fn()} />);

    const row = screen.getByRole("row", { name: /城市晨光/ });
    expect(within(row).getByText("城市、风景")).toBeInTheDocument();
    expect(row.querySelector("time")).toHaveAttribute("datetime", assets[0].created_at);
  });
});
