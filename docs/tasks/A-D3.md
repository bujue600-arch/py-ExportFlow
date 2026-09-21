# A 卡 · D3（09-15 列表域贯通）—— 完成日志与把关清单

## 当日产出

| 产出 | 位置 | 验收 |
|---|---|---|
| 统一请求层：信封校验/三通道错误归一/二进制错误体解析/幂等键 | `apps/web/src/api/client.ts` | vitest 8 项 |
| 筛选序列化纯函数（FilterDraft/serializeFilter） | `features/assets/lib/filter.ts` | vitest 6 项 |
| 草稿/已提交状态机（bullet ⑤） | `features/assets/hooks/useCommittedFilter.ts` | vitest 4 项 |

全绿：`vitest 19 passed / build ✓ / size_gate ✓`。D2 的 PR #1 已合并（你点的 Merge）。

**今晚的坑（已写进讲解）**：jsdom 与 Node 各有一个 Blob 全局类，测试里混用导致 `text()` 返回 `[object Blob]`——测试环境与运行时的 realm 边界问题，正是"测试基建是工程活"的证据。

## 把关清单（今晚请过目，约 15 分钟）

1. **读 `client.ts` 全文**（88 行）：对着讲解 §1.1 的图读，重点 `isEnvelope` 守卫与 `requestBlob` 的双形状处理——这是 bullet ③ 前端侧的完整实现，明晚日报我要听你复述"三通道归一"。
2. **`useCommittedFilter` 的 `submit`**：一行 `setCommitted(draft)` 为什么是"快照语义"？它和 D5 三态全选的 `filterSnapshot` 是什么关系？（讲解 §2.2）
3. **练习 2 的思考题**：后端成功码从 0 改 200 要动几处？先自己数一遍再对答案——这是"契约先行"最直观的论证。

## 面试讲解点

1. 错误归一三通道 + ApiError 携带 traceId 的报障闭环；
2. "结构保证优于约定保证"：draft 永不进 query key；
3. 取消标志（闭包）与 Query 按 key 隔离是同一问题的两条路线。

## 队友侧

- B-D3（列表 API）/C-D3（列表页接真数据）卡已就绪；C 可直接复用 `features/assets/lib/filter.ts` 的类型与序列化、`useCommittedFilter`；
- 提醒：B/C 若 D1/D2 卡还没完成，今天必须补上，D3 起卡与卡之间开始有依赖。
