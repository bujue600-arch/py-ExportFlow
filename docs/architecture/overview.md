# 系统架构总览 v1.0（D7 收官）

> 面试与课程报告的总入口：先看懂这张图，再按五条 bullet 索引深入。

## 1. 全景

```
┌─ 前端 apps/web（React 18 + TS strict + TanStack Query v5）──────────────┐
│  页面层  AssetListPage（作品库）        JobCenterPage（导出中心）          │
│  ────────────────────────────────────────────────────────────────────  │
│  assets 域                    │  jobs 域                                │
│   useCommittedFilter(⑤草稿/   │   useJobUpdates ←─ SSE 状态机(①)        │
│     已提交/镜像三层)           │   useJobs ──┐                          │
│   selection.ts(④三态模型)     │             │ Query 缓存(⑤镜像层)      │
│   SelectionBar / exportSubmit │   jobVersion.ts(②版本守卫+精准更新)      │
│  ────────────────────────────────────────────────────────────────────  │
│  统一请求层 api/client.ts(③信封校验/错误归一/二进制错误体/幂等键)          │
└────────────┬──────────────────────────────┬────────────────────────────┘
        HTTP │（信封 JSON）            SSE  │（job_updated/snapshot）
┌────────────▼──────────────────────────────▼────────────────────────────┐
│ 后端 server（FastAPI + SQLite）                                          │
│  EnvelopeRoute/AppError(③信封+错误码)   TraceIdMiddleware(③trace_id)    │
│  jobs API ── job_service ── bump_and_publish(②版本唯一入口) ── EventBus │
│  queue_worker（任务表即队列：抢占+租约）── export_runner(B：执行/上限/文件)│
│  assets API（B：分页/筛选/排序）          job_download（双形状下载）      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. 一次导出的完整旅程（口述版，面试可直接用）

1. 用户筛选（输入不触发请求，⑤三层状态），勾选/全选（④三态模型纯函数派生）；
2. 点「导出」：`buildExportPayload` 组装 SELECTED_IDS/FILTER 载荷 + 幂等键 → 统一请求层 POST（③信封校验）；
3. 后端幂等三分支判重 → 建任务（version=1 并广播）→ worker 租约抢占（version=2）→ 分批执行、每批 `bump_and_publish` 续租推进；
4. 前端 SSE 状态机（①）收 job_updated → 版本守卫（②）丢弃乱序 → setQueryData 跨视图精准更新；断连则退避重连→降级轮询→网络恢复升级，全程无感；
5. DONE 后终态事件触发条目移除+invalidate 校准（②）→ 用户下载，失败体也是信封 JSON 解析回统一错误对象（③），报障文案带 trace_id 串前后端日志（③）。

## 3. 五条 bullet 索引（代码级）

| bullet | 前端 | 后端 | 锁定测试 |
|---|---|---|---|
| ① SSE 断连自愈 | jobs/lib/sseConnection.ts | api/events.py + EventBus 重放 | sseConnection.test 10 场景 |
| ② job_version 防护 | jobs/lib/jobVersion.ts | bump_and_publish 单一入口 | jobVersion.test 11 用例 + 后端边界 |
| ③ 信封+trace_id | api/client.ts | core/envelope.py + trace.py | client.test 8 + envelope 6 |
| ④ 三态全选+幂等 | assets/lib/selection.ts + exportSubmit.ts | 幂等三分支+1000/3001 上限 | selection 19 + jobs_api 10 |
| ⑤ 三层查询状态 | assets/hooks/useCommittedFilter.ts | assets 分页/筛选（B） | filter 6 + committed 4 |

## 4. AI 协作流程物证（简历第一条的仓库证据链）

| 简历表述 | 仓库证据 |
|---|---|
| 规格先行 | docs/prd、docs/specs 三契约（v1.0→v1.2 演进均有 changelog），契约 commit 先于实现 |
| 版本化规则文件 | .rules/（v1.0→v1.1 变更记录） |
| 源码体量门禁 | scripts/size_gate.py + CI 强制 |
| 可验证 | pytest 36+ / vitest 63+ / e2e_smoke，CI 必绿才合并 |
| 可回溯 | PR #1–#7 按日推进；契约变更均有 PR 与评审（如 PR#4 评审推动契约 v1.1） |

## 5. 关键设计决策一览（每条都能展开三分钟）

1. 信封在路由分发层包装而非中间件改 body（流式兼容 + D2 踩坑记录）；
2. 任务表即队列（抢占+租约+心跳），接口不变可平滑升级中间件；
3. job_version 单一入口递增：版本+事件原子；
4. 降级与重连并行（契约 v1.1 消解矛盾的故事）；
5. 选择模型不变量由构造保证（非法状态不可表达）；
6. "SSE 仅通知、HTTP 校准"的最终一致策略。
