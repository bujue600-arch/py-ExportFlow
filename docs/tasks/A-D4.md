# A 卡 · D4（09-16 导出域后端）—— 完成日志与把关清单

## 当日产出

| 产出 | 位置 | 验收 |
|---|---|---|
| SSE 事件总线（全局日志/扇出/重放窗口） | `services/event_bus.py` | 4 项 |
| 任务表+仓储（任务表即队列、租约抢占） | `models/export_job.py`、`repositories/job_repo.py` | — |
| 任务服务层（幂等创建、bump 单一入口、快照） | `services/job_service.py` | 10 项 |
| 进程内 worker + B 的执行器接线点（占位 3003） | `services/queue_worker.py`、`export_runner.py` | 含在任务测试 |
| 任务 API（创建/列表/详情）+ SSE 端点 | `api/jobs.py`、`api/events.py` | 3 项（SSE 协议） |

全绿：`pytest 31 passed / ruff ✓ / size_gate ✓（server 48.2%）/ 前端 19 无回归`

## 今晚的两个真实 bug（都进了讲解 §5）

1. **include_router 不继承 route_class** → 第一条真实 /api 路由裸奔出信封；骨架期测试的盲区（只测了直挂路由）。修复：子路由器显式声明。
2. **TestClient 流式响应挂起**（httpx2 传输缓冲）→ SSE 测试改为直接消费端点异步生成器，HTTP 层留待 D7 真实服务器端到端验证。

## 把关清单（今晚请过目，约 15 分钟）

1. **读 `job_service.py` 的 `bump_and_publish`**（12 行）：对着讲解 §2 能说出"为什么单一入口"。这是 bullet ② 服务端的根。
2. **幂等三分支**（`create_job` 开头）：同键无/同哈希/异哈希各返回什么？为什么幂等判定在参数校验**之前**？
3. **跑一遍练习 2**（双终端看 SSE 三连跳）——今晚最值得亲眼看的 5 分钟，版本 1→2→3 的实感比读十遍文档强。

## 面试讲解点

1. 队列的教学级取舍与升级路径（接口不变换实现）；
2. 版本+事件原子的单一入口；幂等键三分支；
3. SSE 首块三态（重放/快照/正常）与双保险（服务端重放 + 客户端版本比对）。

## 队友侧（重要）

**B/C 至今零提交，已欠 D1–D3 卡。** B-D4（导出执行器）依赖今晚的 `export_runner.py` 接线点与 `bump_and_publish`；B 必须先补 D1→D2（Asset 模型）→D3（列表 API）再上 D4。今天请在群里推一把：课程要求多人提交记录，冲刺只剩 3 天。
