# C 卡 · D3 —— 列表页接真数据（预计 2–3 小时）

> **你（C）今天的目标**：列表页从 mock 切换到后端真数据，加分页。
> **开始条件**：D3 的 A 卡（统一请求层）与 B 卡（列表 API）都已合入 main。

## 第 1 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/specs/api-contract.md 第 4 节（参数与响应形状）
- .rules/RULES-frontend.md（请求一律走统一请求层、query key 工厂）
- apps/web/src/api/ 下 A 已实现的统一请求层（先读懂它的 request() 怎么用）
- apps/web/src/features/assets/ 下你 D2 写的组件

任务 1：features/assets/keys.ts —— queryKey 工厂：assetListKey(page, pageSize, filter)

任务 2：features/assets/hooks/useAssetList.ts
- 基于 useQuery + 统一请求层请求 GET /api/assets
- filter 的类型 FilterDraft → 查询参数序列化：空值/「全部」不发送；日期转 ISO8601
- retry 关闭（测试与演示需要确定性）

任务 3：改造 AssetListPage.tsx
- 用 useAssetList 替换 mock；表格底部加分页条（上一页/下一页/当前页/共 N 条）
- 筛选表单点「查询」才改变请求条件；翻页沿用当前筛选
- loading 显示「加载中…」，错误显示 message + trace_id 文案（错误对象从统一请求层来）

任务 4：features/assets/__tests__/useAssetList.test.tsx
- mock 统一请求层：成功返回 → data.items 正确；请求层抛统一错误对象 → hook 的 error 有 message 与 traceId
- 遵守 .rules/RULES-testing.md
```

## 第 2 步：验收（后端先跑起来）

```powershell
# 终端 1（仓库根目录）
python -m uvicorn app.main:app --reload --app-dir server
# 终端 2
cd apps/web
npx vitest run
npm run dev
```

浏览器：表格出现真数据；筛选「类型=视频」点查询 → 表格只剩视频且 total 变化；翻页正常。

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d3-C-list-live
git add apps/web/src
git commit -m "feat(assets): 列表页接入真实 API 与分页"
git push -u origin feat/d3-C-list-live
```

PR 标题同名，附一张页面截图。

## 常见问题

| 现象 | 处理 |
|---|---|
| 页面报跨域错误 | 发群里让 A 看后端 CORS 配置，不要自己改后端 |
| 数据一直 loading | 看浏览器控制台网络面板的响应截图发群 |
| 任何报错 | 截图发群（附命令） |
