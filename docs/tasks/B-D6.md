# B 卡 · D6 —— 万条数据与查询性能（预计 1–2 小时）

> **你（B）今天的目标**：为 D7 演示备好"1 万条数据"的真实规模，并确认查询不退化。
> **前置**：PR #4 的 lint 修复必须先 push（已拖两天，这是第一件事）。

## 第 1 步：修 PR #4（照 PR 页面评审意见，5 分钟）

## 第 2 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读 server/app/seed.py 与 repositories/asset_repo.py 后 strictly 实现：

任务 1：增强 seed.py
- 生成 10000 条时确保筛选组合有区分度：三种 asset_type 各约 1/3；status 分布 draft 20%/ready 70%/failed 10%；
  标签池 10 个（每条 1–3 个）；标题从 5 类模板生成（漫剧/封面/配乐/剧本/混剪 + 序号）
- 新增 --profile demo 参数：固定生成演示友好数据（前 50 条创建时间集中在最近 1 小时）
- 打印生成耗时

任务 2：server/tests/test_seed_profile.py
- --count 500 --profile demo 跑一遍，断言：总数 500、三种类型都有、demo 模式下最近1小时的条目 ≥ 50

任务 3：性能验证脚本 scripts/perf_check.py（仓库根 scripts/ 目录）
- 用 sqlite3 直连 server/exportflow.db，计时三种查询：无条件分页、asset_type 过滤、keyword like
- 每种跑 20 次取平均，输出毫秒；超过 50ms 打印 EXPLAIN QUERY PLAN 并提示加索引建议（不要直接改模型，
  把建议打印出来即可）
```

## 第 3 步：验收

```powershell
python -m app.seed --count 10000 --db server/exportflow.db --profile demo
pytest server/tests -q
python scripts/perf_check.py
```

## 第 4 步：提交并开 PR（分支 feat/d6-B-perf-seed，PR 标题同名，附 perf_check 输出）

卡住截图发群。
