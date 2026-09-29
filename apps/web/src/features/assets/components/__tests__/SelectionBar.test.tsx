import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectionBar from "../SelectionBar";
import { emptySelection, enterSelectAll, toggleRow } from "../../lib/selection";

describe("SelectionBar（bullet ④ 的 UI 防线）", () => {
  it("未选择时_导出按钮禁用", () => {
    render(
      <SelectionBar selection={emptySelection()} snapshotTotal={100}
        onToggleSelectAll={() => {}} onExport={() => {}} />,
    );

    expect(screen.getByText("导出 CSV")).toBeDisabled();
    expect(screen.getByText("已选 0 条")).toBeInTheDocument();
  });

  it("显式勾选_显示条数_按钮可用", () => {
    let selection = emptySelection();
    selection = toggleRow(selection, "a");
    selection = toggleRow(selection, "b");

    render(
      <SelectionBar selection={selection} snapshotTotal={100}
        onToggleSelectAll={() => {}} onExport={() => {}} />,
    );

    expect(screen.getByText("已选 2 条")).toBeInTheDocument();
    expect(screen.getByText("导出 JSON")).toBeEnabled();
  });

  it("全选模式_显示全选计数与排除数", () => {
    let selection = enterSelectAll();
    selection = toggleRow(selection, "x");

    render(
      <SelectionBar selection={selection} snapshotTotal={8721}
        onToggleSelectAll={() => {}} onExport={() => {}} />,
    );

    expect(screen.getByText("已选全部 8720 条（排除 1 条）")).toBeInTheDocument();
  });

  it("超上限_出现引导文案_导出按钮禁用", () => {
    render(
      <SelectionBar selection={enterSelectAll()} snapshotTotal={5000}
        onToggleSelectAll={() => {}} onExport={() => {}} />,
    );

    expect(screen.getByTestId("over-limit-tip")).toBeInTheDocument();
    expect(screen.getByText("导出 JSON")).toBeDisabled();
  });

  it("点导出按钮_回调收到格式", () => {
    const onExport = vi.fn();
    render(
      <SelectionBar selection={enterSelectAll()} snapshotTotal={100}
        onToggleSelectAll={() => {}} onExport={onExport} />,
    );

    fireEvent.click(screen.getByText("导出 CSV"));

    expect(onExport).toHaveBeenCalledWith("csv");
  });
});
