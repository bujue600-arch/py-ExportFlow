# B 卡 · D5 —— 修复 PR #4 lint + 后端边界测试（预计 1–2 小时）

> **你（B）今天的目标**：① 按我留在 PR #4 的评审意见修掉 lint（5 分钟，改完 push）；② 补 4 个边界测试，锁住队列的关键正确性。
> **开始条件**：PR #4 的 lint 修复已 push、CI 绿、已合并。

## 第 1 步：修 PR #4（照抄 PR 页面里我的评审意见，此处不重复）

## 第 2 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- .rules/RULES-testing.md、server/tests/conftest.py（测试基建与夹具）
- server/app/services/job_service.py、queue_worker.py、repositories/job_repo.py
- server/tests/test_jobs_api.py（已有测试的写法）

新建 server/tests/test_queue_edges.py，补四个边界测试：

1. test_租约过期_RUNNING任务可被重新抢占：
   创建任务 → run_once 执行（占位执行器会 FAILED——所以这条改用手动方式：
   直接用 job_repo.claim_next 抢占一次得 RUNNING，再把 lease_until 改成过去时间，
   再次 claim_next 应能领到同一个任务）

2. test_任务状态推进_job_version严格单调：
   创建 → claim_next → mark_progress(processed=10,total=100) → complete_job，
   收集每次操作后 job.job_version，断言严格递增列表 == [2, 3, 4]（创建时为 1）

3. test_幂等键_重试期间任务状态推进_仍返回最新态：
   创建任务 → run_once 使其 FAILED → 用同一幂等键同载荷再 POST，
   应返回原任务（status=FAILED 且 job_version 已推进），而不是新建

4. test_事件重放窗口_边界值：
   往 bus 里 publish 3 个事件后把 _log[0] 挤出（模拟窗口滑动），
   断言 window_exceeded(0) 为 True、replay_after(1) 只含 seq 2,3
```

## 第 3 步：验收

```powershell
pytest server/tests -q
```

## 第 4 步：提交并开 PR

```powershell
git checkout -b test/d5-B-queue-edges
git add server/tests/test_queue_edges.py
git commit -m "test(export): 队列边界测试——租约重抢/版本单调/幂等推进/重放窗口"
git push -u origin test/d5-B-queue-edges
```

PR 标题同名。卡住截图发群。
