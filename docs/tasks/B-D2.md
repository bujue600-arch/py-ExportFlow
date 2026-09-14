# B 卡 · D2 —— 数据层骨架与种子数据生成器（预计 1–2 小时，可让 AI 代劳大部分）

> **你（B）今天的目标**：给后端建好「作品 Asset」的数据模型，并写一个能一键生成 1 万条假数据的脚本。
> **开始条件**：等群里说「D2 代码已合入」（今晚 20:00 后 A 合入骨架），明早 `git pull` 最新 main 再开始。

## 第 0 步：环境确认（D1 已完成可跳过）

```powershell
cd $HOME\Desktop\py-ExportFlow
git pull
.venv\Scripts\activate
pip install -r server/requirements.txt
```

## 第 1 步：让 AI 干活

在你能读仓库的 AI 工具（Cursor 等）里打开 `py-ExportFlow`，**把下面整段发给它**：

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/specs/api-contract.md（第 4 节 Asset 形状）
- .rules/RULES-backend.md（分层与代码规则）
- server/app/db.py 与 server/app/models/__init__.py（已存在的骨架约定）

任务 1：新建 server/app/models/asset.py
- 用 SQLModel 定义 Asset 表模型，字段与 api-contract.md 第 4 节的 Asset 形状完全一致：
  id(str 主键)、title(str)、asset_type(str: image|video|script)、
  status(str: draft|ready|failed)、tags(list[str]，SQLite 下存 JSON 字符串)、
  size_bytes(int)、created_at(datetime, 默认当前时间)
- 提供一个 to_dto() 方法返回字典，字段名与契约完全一致。

任务 2：新建 server/app/seed.py（可直接 python -m app.seed 运行）
- 参数：--count（默认 10000）、--db（默认 server/exportflow.db）
- 用固定随机种子 42 生成确定性数据：title 从 20 个中文标题模板随机组合；
  asset_type/status/tags/size_bytes(1KB~500MB) 随机；created_at 分布在近 90 天
- 先建表再插入；重复运行时先清空 Asset 表
- 结束打印实际插入条数

任务 3：新建 server/tests/test_asset_model.py
- 用 tmp_path 下的临时 SQLite：建表→插 3 条→按 asset_type 查询→断言数量与字段
- 遵守 .rules/RULES-testing.md 的 AAA 结构
```

## 第 2 步：验收（复制粘贴，全部要绿）

```powershell
pytest server/tests -q
python -m app.seed --count 200 --db server/exportflow.db
python -c "import sqlite3; print(sqlite3.connect('server/exportflow.db').execute('select count(*) from asset').fetchone())"
```

预期：pytest 全过；最后一条命令输出 `(200,)`。

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d2-B-data-layer
git add server/app/models/asset.py server/app/seed.py server/tests/test_asset_model.py
git commit -m "feat(data): Asset 模型与种子数据生成器"
git push -u origin feat/d2-B-data-layer
```

到仓库网页点 "Compare & pull request"，标题 `feat(data): Asset 模型与种子数据生成器`，正文按模板勾选后 Create。

## 常见问题

| 现象 | 处理 |
|---|---|
| `pip install` 报错 SQLModel | 加 `-i https://pypi.tuna.tsinghua.edu.cn/simple` |
| pytest 找不到测试 | 确认在仓库根目录执行 |
| 任何报错 | 截图发群（附你跑的命令） |
