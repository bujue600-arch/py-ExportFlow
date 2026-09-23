/**
 * 三态选择模型（selection-payload.md 全文的实现，bullet ④ 核心）。
 *
 * 三态：
 *   selectAll=false + explicitIds —— 显式勾选若干条
 *   selectAll=true  + excludedIds —— 全选所有筛选结果、再排除个别（跨页全选）
 *
 * 不变量（selection-payload §2）：
 *   selectAll=true 时 explicitIds 必须为空；false 时 excludedIds 必须为空。
 *   本模块所有操作函数都保证不变量——UI 不可能构造出非法状态。
 *
 * 全部为无副作用纯函数：同输入同输出，可表驱动测试（RULES-frontend #12）。
 */

import type { FilterDraft } from "./filter";
import { serializeFilter } from "./filter";

export const EXPORT_LIMIT = 1000;

export interface SelectionState {
  selectAll: boolean;
  explicitIds: Set<string>;
  excludedIds: Set<string>;
}

export type HeaderState = "all" | "some" | "none";

export function emptySelection(): SelectionState {
  return { selectAll: false, explicitIds: new Set(), excludedIds: new Set() };
}

/** 进入「全选所有筛选结果」：两层集合清零（不变量重置）。 */
export function enterSelectAll(): SelectionState {
  return { selectAll: true, explicitIds: new Set(), excludedIds: new Set() };
}

/** 退出全选：整体清空回未选状态。 */
export function exitSelectAll(): SelectionState {
  return emptySelection();
}

/** 切换单行：按当前模式维护对应集合，永不破坏不变量。 */
export function toggleRow(state: SelectionState, id: string): SelectionState {
  if (state.selectAll) {
    const excluded = new Set(state.excludedIds);
    if (excluded.has(id)) {
      excluded.delete(id); // 被排除的行再点 = 恢复选中
    } else {
      excluded.add(id);
    }
    return { ...state, excludedIds: excluded };
  }
  const explicit = new Set(state.explicitIds);
  if (explicit.has(id)) {
    explicit.delete(id);
  } else {
    explicit.add(id);
  }
  return { ...state, explicitIds: explicit };
}

export function isRowSelected(state: SelectionState, id: string): boolean {
  return state.selectAll ? !state.excludedIds.has(id) : state.explicitIds.has(id);
}

/** 表头三态：all=本页全选 / some=部分 / none=无。 */
export function deriveHeaderState(state: SelectionState, pageIds: string[]): HeaderState {
  const flags = pageIds.map((id) => isRowSelected(state, id));
  if (flags.length === 0 || flags.every(Boolean)) return "all";
  if (flags.some(Boolean)) return "some";
  return "none";
}

/**
 * 已选总数。全选模式 = 快照命中总数 − 排除数（排除集元素必来自快照命中集，
 * 见契约 §3 的 UI 约束：只有快照筛选下可见的行才可被排除）。
 */
export function countSelected(state: SelectionState, snapshotTotal: number): number {
  if (state.selectAll) {
    return Math.max(0, snapshotTotal - state.excludedIds.size);
  }
  return state.explicitIds.size;
}

/** 上限防御：超 1000 时 UI 禁止提交并引导（服务端仍会再校验，双保险）。 */
export function isOverLimit(state: SelectionState, snapshotTotal: number): boolean {
  return countSelected(state, snapshotTotal) > EXPORT_LIMIT;
}

export function describeSelection(state: SelectionState, snapshotTotal: number): string {
  if (state.selectAll) {
    const excluded = state.excludedIds.size;
    const total = countSelected(state, snapshotTotal);
    return excluded > 0 ? `已选全部 ${total} 条（排除 ${excluded} 条）` : `已选全部 ${total} 条`;
  }
  return `已选 ${state.explicitIds.size} 条`;
}

export type ExportPayload =
  | { mode: "SELECTED_IDS"; selected_ids: string[] }
  | { mode: "FILTER"; filter: Record<string, string>; excluded_ids: string[] };

/** 按选择态组装导出载荷（契约 §4 的组装规则表）。filterSnapshot=发起全选时的已提交筛选。 */
export function buildExportPayload(
  state: SelectionState,
  filterSnapshot: FilterDraft,
): ExportPayload {
  if (state.selectAll) {
    return {
      mode: "FILTER",
      filter: serializeFilter(filterSnapshot), // 空筛选 → 空对象（= 全量快照，api-contract §4/§5）
      excluded_ids: [...state.excludedIds],
    };
  }
  return { mode: "SELECTED_IDS", selected_ids: [...state.explicitIds] };
}
