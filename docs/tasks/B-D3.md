# B 卡 · D3 —— 作品列表 API（分页/筛选/排序）（预计 2–3 小时）

> **你（B）今天的目标**：实现 `GET /api/assets`，让前端能拿到真数据。
> **开始条件**：D2 的 A/B 代码都已合入 main（骨架 + Asset 模型），`git pull` 后开始。

## 第 1 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/specs/api-contract.md 第 4 节（GET /api/assets 的参数与响应形状，逐字段对齐）
- .rules/RULES-backend.md（api→services→repositories 分层，路由不得直接碰数据库）
- server/app 下已有代码（信封中间件已由 A 实现，路由只需返回 data 本体）

任务 1：server/app/repositories/asset_repo.py
- list_assets(session, *, page, page_size, asset_type, status, tag, keyword, created_from, created_to, sort) -> (items, total)
- 过滤规则：asset_type/status 精确；tag 对 tags JSON 列做包含匹配；keyword 对 title 做 contains（大小写不敏感）；
  created_from/created_to 闭区间；sort 支持 created_at / -created_at / size_bytes，默认 -created_at
- 用 SQLModel/SQLAlchemy 查询，禁止全表拉回内存再过滤

任务 2：server/app/services/asset_service.py —— 薄封装，参数校验（page>=1, 1<=page_size<=100，非法抛 AppError 1001）

任务 3：server/app/api/assets.py —— GET /api/assets，Query 参数与契约一致，响应 data 形状 {items,total,page,page_size}

任务 4：server/tests/test_api_assets.py，至少覆盖：
- 默认分页返回 20 条且 total 正确
- asset_type 过滤后 total 与过滤条件匹配
- keyword 大小写不敏感
- sort=-created_at 首条不早于末条
- page_size=0 → 信封 code 1001（HTTP 422）
- 测试库用 fixture 临时 SQLite，先 seed 60 条确定性数据（可复用 app.seed 的生成函数）
```

## 第 2 步：验收

```powershell
pytest server/tests -q
python -m uvicorn app.main:app --reload --app-dir server
```

另开一个 PowerShell：

```powershell
curl http://127.0.0.1:8000/api/assets?page=1&page_size=5
curl "http://127.0.0.1:8000/api/assets?asset_type=video&page_size=3"
```

预期：返回信封 JSON，code=0，items 长度正确、形状与契约逐字段一致。

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d3-B-assets-api
git add server
git commit -m "feat(assets): 列表 API（分页/筛选/排序）与测试"
git push -u origin feat/d3-B-assets-api
```

PR 标题同名。验收命令输出贴进 PR 描述。

## 常见问题

| 现象 | 处理 |
|---|---|
| 返回不是信封形状 | 检查是否 return 了裸 dict——信封由中间件包，路由只返回 data；把现象截图发群 |
| tag 过滤不生效 | tags 是 JSON 列，用 like/json_contains 类匹配；把你的实现截图发群里让 A 看 |
| 任何报错 | 截图发群（附命令） |
