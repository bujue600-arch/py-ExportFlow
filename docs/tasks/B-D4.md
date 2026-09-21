# B 卡 · D4 —— 导出执行：文件生成 / 1000 上限 / 下载端点（预计 2–3 小时）

> **你（B）今天的目标**：导出任务真正能干活——按选择载荷查出数据、守住 1000 条上限、生成 CSV/JSON 文件、提供下载。
> **开始条件**：D4 的 A 卡（任务表/队列/SSE/幂等/创建端点）已合入 main。**先读一遍 `docs/specs/selection-payload.md` 再开工。**

## 第 1 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事（A 的 D4 代码已存在，先读懂再动手；如函数签名与下述不符，以仓库实际为准并在输出中说明差异）：
- docs/specs/selection-payload.md（载荷模式与校验规则，逐条实现）
- docs/specs/api-contract.md 第 2、5 节（错误码与下载双形状）
- .rules/RULES-backend.md
- server/app 下 A 已实现的任务模型、队列与创建端点

任务 1：server/app/services/export_runner.py —— execute_export(session, job) -> None
- 按 job 的载荷解析选择集：SELECTED_IDS 模式按 id 集合取；FILTER 模式复用 asset_repo 的过滤查询并应用 excluded_ids
- 上限校验：SELECTED_IDS 超 1000 → 任务落败（error code 1002）；FILTER 命中-排除 > 1000 → 任务落败（error code 3001，data 带 limit/total）
- 逐批(500 条/批)拉取并写文件：CSV（utf-8-sig 带表头）或 JSON（数组），写入 server/exports/<job_id>.<ext>
- 每批结束调用 A 提供的进度上报入口更新 total_count/processed_count/progress 并 bump job_version（只经 A 的单一入口，禁止直改）
- 完成：状态置 DONE、写 file 信息（name/size_bytes）；任何异常：状态 FAILED、error=3003 并带摘要

任务 2：把 execute_export 接到 A 的 worker 队列消费处（A 已留好调用点，只改一行接线）

任务 3：server/app/api/jobs_download.py —— GET /api/export-jobs/{id}/download
- 非 DONE → 信封 2002；DONE 但文件不存在 → 4001；成功 → FileResponse，Content-Disposition 按 api-contract 第 5 节
- 失败路径返回信封 JSON（Content-Type application/json）——这是「二进制错误体」的来源，必须有测试锁住

任务 4：server/tests/test_export_runner.py + test_jobs_download.py，至少覆盖：
- SELECTED_IDS 5 条 → DONE，文件存在且行数 5（含表头 6 行 CSV）
- FILTER 含 excluded_ids → 文件不含被排除的
- SELECTED_IDS 1001 条 → FAILED + 1002
- FILTER 命中 5000 → FAILED + 3001 且 data.total=5000
- 下载：DONE → 200 且 Content-Disposition 正确；未完成 → 信封 2002
```

## 第 2 步：验收

```powershell
pytest server/tests -q
python -m uvicorn app.main:app --reload --app-dir server
# 另开终端，创建一个小导出（先生成 20 条数据：python -m app.seed --count 20）
curl -X POST http://127.0.0.1:8000/api/export-jobs -H "Content-Type: application/json" -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" -d "{\"mode\":\"SELECTED_IDS\",\"selected_ids\":[],\"format\":\"csv\"}"
# 返回的 job_id 等几秒后：
curl -i http://127.0.0.1:8000/api/export-jobs/<job_id>/download --output test.csv
```

预期：pytest 全绿；下载得到非空 CSV 文件。（空选择集会 1002，属预期行为之一，测试里已覆盖。）

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d4-B-export-runner
git add server
git commit -m "feat(export): 导出执行/上限防御/下载端点与测试"
git push -u origin feat/d4-B-export-runner
```

PR 标题同名。

## 常见问题

| 现象 | 处理 |
|---|---|
| 不知道 A 的进度上报入口在哪 | 看 server/app/services/ 下 A 的 D4 文件，或直接群里问 |
| job_version 没变化 | 你绕过了 A 的单一入口；对照 RULES-backend 第 8 条 |
| 任何报错 | 截图发群（附命令） |
