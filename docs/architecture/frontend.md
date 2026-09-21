# 前端架构方案 v1.0

- **日期**：2026-09-14（D2，先于前端代码落地）
- **读者**：全部成员；C 的 D2–D4 任务卡以本文为准

## 1. 技术选型与理由

| 选择 | 理由 |
|---|---|
| Vite + React 18 + TypeScript(strict) | 与实习项目同构，面试可对照；strict 挡住类型债 |
| TanStack Query v5 | 服务端状态唯一事实源；bullet ② 的 setQueryData 精准更新依赖它 |
| react-router-dom v6 | 两个页面：作品库 `/`、导出中心 `/jobs` |
| Vitest + Testing Library | 假时钟（vi.useFakeTimers）支撑 bullet ①② 的时序测试 |
| 样式：单一 index.css + CSS 变量 | 课程范围刻意从简，把预算花在机制上 |

## 2. 目录分层（按 feature 组织，不按文件类型组织）

```
apps/web/src/
├─ api/            # 统一请求层（D3）：信封校验、错误归一化、Idempotency-Key
├─ features/       # 业务域：域内自治，域间只经由 api 与 lib
│  ├─ assets/      # 作品域：components / hooks / keys / lib(纯函数) / __tests__
│  └─ jobs/        # 导出任务域：同构
├─ pages/          # 页面组装层：只做「布局 + 组合 features」，不放业务逻辑
├─ components/     # 跨域通用组件（Badge、Pagination 等）
├─ hooks/          # 跨域 hooks
├─ lib/            # 跨域纯函数（无副作用、可独立测试）
└─ styles/         # CSS 变量与基础类
```

**为什么不按类型分（components/ hooks/ 全局摊平）**：feature 内聚后，删除/重构一个域只动一个目录；跨域复用的东西升到顶层，逼人思考「这真的是通用吗」。

## 3. 数据流与状态边界（本架构最重要的图）

```
用户交互
   │
   ▼
组件（本地 UI 态：useState）
   │  只通过两条通道拿/发数据
   ├─▶ 统一请求层（api/）──HTTP──▶ 后端（信封）
   │        │
   │        ▼
   └─▶ TanStack Query 缓存（服务端状态的唯一事实源）
            ▲
            │ setQueryData（SSE 增量）/ invalidateQueries（HTTP 校准）
            │
        SSE 通道（D4 起接入，features/jobs/lib/sseConnection）
```

三条铁律（对应 `.rules/RULES-frontend`）：

1. **服务端状态只住 Query 缓存**，禁止复制进本地 state 双写（漂移之源）。
2. **SSE 只做通知/增量**，怀疑不一致一律 `invalidateQueries` 走 HTTP 校准（bullet ② 的最终一致策略）。
3. **纯函数下沉 lib/**：选择模型派生、jobVersion 比对、退避序列全部可独立测试。

## 4. 状态三层模型（bullet ⑤ 的落点，D3 实现）

```
草稿态 draft      —— FilterForm 受控输入中，永不发请求
已提交态 committed —— 最近一次点「查询」的筛选快照，query key 的一部分
服务端镜像 mirror —— Query 缓存里的 data，只被响应与 SSE 更新
```

翻页/导出永远用 committed；draft 只是 UI。过期响应防御用请求取消标志（useEffect cleanup 闭包）。

## 5. 错误处理管线（bullet ③ 前端侧，D3 实现）

```
fetch → 信封结构校验（形状不对视为 5000）
      → code≠0 或 !res.ok → 归一化为 ApiError {code, message, traceId}
      → 二进制下载失败体 → text() → JSON.parse → 同样归一化
UI 层永远只面对 ApiError 一种错误形状，文案模板「操作失败（trace_id: xxx）」
```

## 6. SSE 集成点（bullet ①②，D6 实现）

`features/jobs/lib/sseConnection.ts`：连接状态机（connected/reconnecting/polling 三态），组件只消费其输出。测试用 FakeEventSource 注入 + 假时钟驱动，9 场景见 `sse-events.md` §6。

## 7. 测试策略

| 层 | 工具 | 优先锁定 |
|---|---|---|
| 纯函数（lib） | vitest 表驱动 | 选择模型全组合、退避序列、版本比对 |
| hooks | renderHook + fake timers | useAssetList 取消、sseConnection 状态机 |
| 组件 | Testing Library | 表格渲染、JobCard 四态 |

## 8. 里程碑对照排期

D2 骨架（本文 + 工程搭建）→ D3 请求层与列表接通 → D4 任务域 hook → D5 选择模型 → D6 SSE 状态机 → D7 端到端演示。
