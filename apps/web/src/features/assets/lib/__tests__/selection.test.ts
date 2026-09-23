/** 三态选择模型全组合测试（bullet ④「模型行为由组件级测试锁定」的模型侧）。 */

import { describe, expect, it } from "vitest";
import { defaultFilter } from "../filter";
import {
  buildExportPayload,
  countSelected,
  deriveHeaderState,
  emptySelection,
  enterSelectAll,
  exitSelectAll,
  isOverLimit,
  isRowSelected,
  toggleRow,
} from "../selection";

const ids = ["a", "b", "c"];

describe("显式勾选模式", () => {
  it("勾选两行_已选数与载荷一致", () => {
    let state = emptySelection();
    state = toggleRow(state, "a");
    state = toggleRow(state, "c");

    expect(countSelected(state, 9999)).toBe(2);
    expect(isRowSelected(state, "a")).toBe(true);
    expect(buildExportPayload(state, defaultFilter())).toEqual({
      mode: "SELECTED_IDS",
      selected_ids: ["a", "c"],
    });
  });

  it("再点一次同行为取消", () => {
    let state = toggleRow(emptySelection(), "a");
    state = toggleRow(state, "a");

    expect(countSelected(state, 9999)).toBe(0);
  });

  it("勾选超1000条_isOverLimit为真_禁提交防线", () => {
    let state = emptySelection();
    for (let i = 0; i < 1001; i++) {
      state = toggleRow(state, `id-${i}`);
    }

    expect(countSelected(state, 9999)).toBe(1001);
    expect(isOverLimit(state, 9999)).toBe(true);
  });
});

describe("全选模式（跨页全选）", () => {
  it("进入全选_全部选中_计数等于快照总数", () => {
    const state = enterSelectAll();

    expect(isRowSelected(state, "any-id")).toBe(true);
    expect(countSelected(state, 8721)).toBe(8721);
  });

  it("排除两行_计数为总数减排除数", () => {
    let state = enterSelectAll();
    state = toggleRow(state, "a");
    state = toggleRow(state, "b");

    expect(countSelected(state, 8721)).toBe(8719);
    expect(isRowSelected(state, "a")).toBe(false);
    expect(isRowSelected(state, "c")).toBe(true);
  });

  it("排除后再点同行为恢复选中", () => {
    let state = enterSelectAll();
    state = toggleRow(state, "a");
    state = toggleRow(state, "a");

    expect(countSelected(state, 100)).toBe(100);
  });

  it("全选命中总数超上限_拦截", () => {
    const state = enterSelectAll();

    expect(isOverLimit(state, 5000)).toBe(true);
    expect(isOverLimit(state, 1000)).toBe(false);
  });

  it("全选+排除到1000以内_放行_载荷带排除集", () => {
    let state = enterSelectAll();
    for (let i = 0; i < 4001; i++) {
      state = toggleRow(state, `id-${i}`);
    }
    const snapshot = { ...defaultFilter(), assetType: "video" as const };

    expect(isOverLimit(state, 5000)).toBe(false);
    expect(buildExportPayload(state, snapshot)).toEqual({
      mode: "FILTER",
      filter: { asset_type: "video" },
      excluded_ids: expect.arrayContaining([`id-0`, `id-4000`]),
    });
  });

  it("全选且无筛选_载荷filter为空对象_表示全量快照", () => {
    const payload = buildExportPayload(enterSelectAll(), defaultFilter());

    expect(payload).toEqual({ mode: "FILTER", filter: {}, excluded_ids: [] });
  });

  it("退出全选_回到未选状态", () => {
    let state = enterSelectAll();
    state = toggleRow(state, "a");
    state = exitSelectAll();

    expect(countSelected(state, 8721)).toBe(0);
    expect(state.selectAll).toBe(false);
  });
});

describe("表头三态派生", () => {
  it("无可见行视为all", () => {
    expect(deriveHeaderState(emptySelection(), [])).toBe("all");
  });

  it("部分勾选为some_全勾为all_全无为none", () => {
    let state = emptySelection();
    state = toggleRow(state, "a");
    expect(deriveHeaderState(state, ids)).toBe("some");

    state = toggleRow(state, "b");
    state = toggleRow(state, "c");
    expect(deriveHeaderState(state, ids)).toBe("all");
    expect(deriveHeaderState(enterSelectAll(), ids)).toBe("all");

    expect(deriveHeaderState(emptySelection(), ids)).toBe("none");
  });

  it("全选模式下排除本页一行_表头为some", () => {
    let state = enterSelectAll();
    state = toggleRow(state, "b");

    expect(deriveHeaderState(state, ids)).toBe("some");
  });
});

describe("不变量：任何操作序列都不会构造出非法状态", () => {
  it("selectAll时explicit恒空_非selectAll时excluded恒空", () => {
    let state = emptySelection();
    state = toggleRow(state, "x"); // 显式模式操作
    expect([...state.excludedIds]).toEqual([]);

    state = enterSelectAll();
    state = toggleRow(state, "y"); // 全选模式操作
    expect([...state.explicitIds]).toEqual([]);
  });
});
