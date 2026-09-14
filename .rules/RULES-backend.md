# 后端规则（RULES-backend）v1.0

适用于 `server/` 下所有 Python 代码。违反即 review 打回。

## 架构与分层

1. 分层：`api`（路由 + 请求/响应模型）→ `services`（业务逻辑）→ `repositories`（数据访问）→ `models`（SQLModel 表模型）。**禁止跨层**：路由不得直接操作数据库。
2. 依赖注入经 FastAPI `Depends`；数据访问一律注入 session，禁止全局 session。
3. 端点函数只做：参数解析 → 调 service → 返回 pydantic 模型。业务逻辑一律在 service。

## 契约与响应

4. 响应必须走统一信封中间件；路由内**禁止手工拼** `{code, message, data}`。
5. 错误一律 `raise AppError(code=…)`（项目自定义异常），由全局 exception handler 归一为信封；错误码只能取自 `api-contract.md` 错误码表，**禁止现场发明**。
6. pydantic 模型即契约：字段名、类型、可选性与 `docs/specs/` 一致；改契约先提契约 PR。
7. 请求校验交给 pydantic（422 由 handler 转 1001）。

## 导出域专用

8. `job_version` 只能经 `bump_and_publish(job, …)` 单一入口递增并广播事件。
9. 幂等键：`(idempotency_key, payload_hash)` 唯一约束，命中即返回原任务。
10. 队列：命令表 + 进程内 worker；worker 抢占必须带租约时间戳，防止任务卡死。

## 代码质量

11. 禁止 `print`，统一 `logging`，且日志记录必须携带 `trace_id`。
12. 单文件 ≤ 300 行（`scripts/size_gate.py` 强制）；超限先拆分再提交。
13. 类型注解全覆盖；`# type: ignore` 需注释原因。
14. 每个路由至少 1 个正常 + 1 个异常 pytest 用例（见 RULES-testing）。
15. 依赖集中在 `server/requirements.txt`，禁止提交时顺手升级依赖版本。
