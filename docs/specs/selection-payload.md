# 契约三：三态选择模型与导出载荷

- **版本**：v1.0（2026-09-14）
- **依赖**：`api-contract.md` §5 创建导出。

## 1. 问题

列表可达 1 万条，导出上限 1000 条：「全选所有筛选结果」无法用 ID 枚举表达（载荷会超限），必须以**筛选快照 + 排除集**表达全选语义。

## 2. 前端选择模型（单一事实源）

```ts
interface SelectionState {
  selectAll: boolean;        // 三态中的「全选所有筛选结果」标志
  explicitIds: Set<string>;  // 非全选模式下的显式勾选集
  excludedIds: Set<string>;  // 全选模式下被取消的条目
  filterSnapshot: AssetFilter | null; // 发起全选时的筛选快照
}
```

**不变量**：

- `selectAll === false` 时 `excludedIds` 必须为空（无意义）。
- `selectAll === true` 时 `explicitIds` 必须为空。
- `filterSnapshot` 仅在全选模式有意义，且一旦进入全选模式即冻结（后续筛选输入属于「草稿」，提交前不影响选择语义）。

## 3. 派生规则（必须为无副作用纯函数）

| 派生 | 规则 |
|---|---|
| 单行勾选态 | 全选 ? `!excluded.has(id)` : `explicit.has(id)` |
| 当前页勾选数 | 逐行求和 |
| 已选总数 | 全选 ? `serverTotal(筛选快照) − |excluded ∩ 快照命中集|` : `|explicit|` |
| 是否超限 | 已选总数 > 1000 |

> 已选总数在「全选 + 排除」场景需要服务端配合：后端提供按 filter 统计的能力（`GET /api/assets` 的 `total` 即命中数），排除数以本地 `excludedIds` 计。UI 展示为「已选全部 8721 条（已排除 3 条）」。

## 4. 载荷组装规则

| 选择态 | mode | 载荷 |
|---|---|---|
| 非全选 | `SELECTED_IDS` | `{ selected_ids: [...explicitIds] }`，长度必须 ≤ 1000（前端防御 + 后端校验 1002） |
| 全选 | `FILTER` | `{ filter: filterSnapshot, excluded_ids: [...excludedIds] }` |

- 请求体：`{ mode, selected_ids?, filter?, excluded_ids?, format: "csv" | "json" }` + 头 `Idempotency-Key`。
- 后端校验：
  - SELECTED_IDS：空集或 > 1000 → 1002。
  - FILTER：按 filter 统计命中数，`命中数 − 排除数 > 1000` → 3001（data 携带 `{limit, total}`，UI 据此引导用户缩小筛选或改用显式勾选）。

## 5. 幂等键规则

- 前端每次「创建导出意图」生成 uuid，绑定当前载荷；重试（含网络层重试、用户重复点击防抖内的重发）复用同一 key。
- 后端：`Idempotency-Key` + 载荷哈希唯一约束。同 key 同哈希 → 返回原任务；同 key 不同哈希 → 3002。

## 6. 测试要求

- 纯函数：三态切换全组合、计数派生、载荷组装、上限防御（组件级测试锁定）。
- 后端：三种载荷形状、1002/3001/3002 各至少一例。
