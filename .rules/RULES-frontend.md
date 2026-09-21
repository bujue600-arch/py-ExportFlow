# 前端规则（RULES-frontend）v1.0

适用于 `apps/web/src` 下所有 TS/TSX 代码。

## 工程与语言

1. TypeScript **strict**，禁止 `any`（确需豁免须注释理由并在 review 说明）。
2. 目录按域组织：`api/`（统一请求层）、`features/assets`、`features/jobs`、`components/`（跨域通用组件）、`lib/`（纯函数）、`hooks/`（跨域 hooks）。
3. 组件优先函数式；单组件 ≤ 150 行，超限拆子组件或抽 hook。

## 请求与状态

4. **所有 HTTP 一律经 `api/client.ts` 统一请求层**，组件内禁止裸 `fetch`。
5. 请求层职责：信封结构校验、错误归一化（业务错误/HTTP 错误/二进制错误体 → 同一错误对象形状 `{code, message, traceId}`）、`Idempotency-Key` 注入。
6. 服务端状态一律 TanStack Query；query key 用工厂函数集中定义（`features/*/keys.ts`），禁止散落字符串。
7. 本地 UI 状态与草稿态用 `useState`/`useReducer`；**禁止**把服务端镜像复制进本地 state 再双写。
8. 列表页三层状态：草稿（输入中）/ 已提交（最近一次提交条件）/ 服务端镜像（query 缓存）；输入**永不**触发请求。
9. 竞态防御：过期响应不得覆盖新结果（取消标志或 AbortController；`useEffect` cleanup 必须 cleanup）。

## SSE 与选择模型

10. SSE 连接状态机集中在 `features/jobs/lib/sseConnection.ts`，组件只消费其输出状态（connected/reconnecting/polling）。
11. 事件应用前必须做 `job_version` 比对，过期即丢弃；SSE 更新用 `setQueryData` 精准写入，需要校准时用 `invalidateQueries`。
12. 三态选择模型的所有派生（勾选态/计数/载荷组装）必须是 `lib/` 下无副作用纯函数，组件不得内联实现。

## 测试

13. 关键纯函数（选择模型、jobVersion 比对、退避序列）100% 有单测；核心 hook（连接状态机、列表查询）有 FakeEventSource + 假时钟集成测试（见 RULES-testing）。
14. 样式从简（课程范围），但不引入内联样式堆砌；统一用 CSS Modules 或 index.css 变量。
