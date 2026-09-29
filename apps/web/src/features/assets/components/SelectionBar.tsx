/**
 * 选择操作条（受控组件）：全选开关 / 计数描述 / 超限拦截 / 导出按钮。
 * 只消费 SelectionState 的派生结果，不持有选择状态本身（状态由页面统一管理）。
 */

import { describeSelection, isOverLimit, type SelectionState, EXPORT_LIMIT } from "../lib/selection";

export interface SelectionBarProps {
  selection: SelectionState;
  /** 发起全选时的快照命中总数（列表接口的 total）。 */
  snapshotTotal: number;
  onToggleSelectAll: () => void;
  onExport: (format: "csv" | "json") => void;
  disabled?: boolean;
}

export default function SelectionBar({
  selection,
  snapshotTotal,
  onToggleSelectAll,
  onExport,
  disabled = false,
}: SelectionBarProps) {
  const overLimit = isOverLimit(selection, snapshotTotal);
  const none = selection.explicitIds.size === 0 && !selection.selectAll;

  return (
    <div className="toolbar" data-testid="selection-bar">
      <label>
        <input
          type="checkbox"
          checked={selection.selectAll}
          onChange={onToggleSelectAll}
          disabled={disabled}
        />
        全选所有筛选结果
      </label>
      <span data-testid="selection-desc">{describeSelection(selection, snapshotTotal)}</span>
      {overLimit && (
        <span className="error-text" data-testid="over-limit-tip">
          超过单次导出上限 {EXPORT_LIMIT} 条，请缩小筛选范围或取消部分勾选
        </span>
      )}
      <span style={{ flex: 1 }} />
      <button
        className="btn"
        disabled={disabled || none}
        onClick={() => onExport("csv")}
      >
        导出 CSV
      </button>
      <button
        className="btn btn-primary"
        disabled={disabled || none || overLimit}
        onClick={() => onExport("json")}
        title={overLimit ? "已超上限" : undefined}
      >
        导出 JSON
      </button>
    </div>
  );
}
