import { render, screen, within } from "@testing-library/react";
import AssetTable from "../components/AssetTable";
import { mockAssets } from "../mock";

describe("AssetTable", () => {
  it("test_渲染表格_十二条作品_显示十二行数据和六个表头", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} />);

    expect(screen.getAllByRole("row").slice(1)).toHaveLength(12);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent))
      .toEqual(["标题", "类型", "状态", "标签", "大小", "创建时间"]);
  });

  it("test_显示徽章_混合类型状态_使用中文文案", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} />);

    for (const label of ["图片", "视频", "剧本", "草稿", "就绪", "失败"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("test_显示大小_跨KB和MB_格式化字节值", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} />);

    expect(screen.getByText("512.0 KB")).toBeInTheDocument();
    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
    expect(screen.queryByText("524288")).not.toBeInTheDocument();
    expect(screen.queryByText("1572864")).not.toBeInTheDocument();
  });

  it("test_显示作品详情_有标签和创建时间_保留对应内容", () => {
    const assets = structuredClone(mockAssets);

    render(<AssetTable assets={assets} />);

    const row = screen.getByRole("row", { name: /城市晨光/ });
    expect(within(row).getByText("城市、风景")).toBeInTheDocument();
    expect(row.querySelector("time")).toHaveAttribute("datetime", assets[0].created_at);
  });
});
