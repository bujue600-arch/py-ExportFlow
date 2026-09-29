# C 卡 · D6 —— 前端集成日：列表页 + 导出中心页接通（预计 3–4 小时，可分两天）

> **你（C）今天的目标**：把 A 写好的零件接成完整页面。你已经完成 D1（PR #6 已合并，很好！），今天做两件事：① 补 D2 静态 UI；② 把数据层接上。做不完的部分明天继续，顺序不要乱。
> **开始前**：`git pull` 最新 main。A 的零件都在：`features/assets/`（选择模型/SelectionBar/useCommittedFilter）、`features/jobs/`（useJobs/useJobUpdates）、`api/client.ts`（统一请求层）。

## 第 1 部分：补 D2 静态 UI（照 docs/tasks/C-D2.md，含行复选框的增补）

## 第 2 部分：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/architecture/frontend.md（分层与数据流）
- .rules/RULES-frontend.md
- apps/web/src 下 A 已写好的：api/client.ts、features/assets/（filter/selection/exportSubmit/hooks/components）、features/jobs/（keys/hooks/types/lib）、pages/ 现有骨架
- 先读懂再动手：所有请求必须走统一请求层；hook 已存在就不要重写

任务 1：features/assets/hooks/useAssetList.ts
- 基于 useQuery：queryKey 用 assetsListKey(page, pageSize, committedFilter)
  （在 features/assets/keys.ts 新建该工厂）
- queryFn 用统一请求层请求 GET /api/assets：查询参数用 serializeFilter(committed) 序列化，
  加 page/page_size；retry 已在全局关闭，不要开
- 返回类型与契约第 4 节一致

任务 2：改造 pages/AssetListPage.tsx 为完整页面
- 用 useCommittedFilter 管理 draft/committed；FilterForm 绑定 draft，点「查询」调 submit
- 分页状态 page/pageSize（useState，查询条件变化时 page 回到 1）
- useAssetList(committed, page) 取数：表格 loading/错误（错误文案用 ApiError.toUserMessage()，含 trace_id）
- 表格行复选框 + 表头三态框：全部用 lib/selection.ts 的纯函数派生（isRowSelected/toggleRow/deriveHeaderState）
- 页面顶部放 SelectionBar：props 传 selection、snapshotTotal=当前 total、onToggleSelectAll
  （enterSelectAll/exitSelectAll）、onExport
- onExport：buildExportPayload(selection, committed) + createExportIntent().submit()，
  成功后跳转 /jobs（用 navigate），失败展示 toUserMessage()

任务 3：改造 pages/JobCenterPage.tsx
- useJobs({page:1, pageSize:20}) 列表 + 简单分页条
- 页面顶部调 useJobUpdates() 展示连接相位徽章（SSE_PHASE_TEXT 已导出）
- 每个任务一张卡片：状态徽章配色 QUEUED灰/RUNNING蓝/DONE绿/FAILED红；RUNNING 显示进度条
  （progress）；DONE 显示「下载」按钮：用 api/client.ts 的 requestBlob 触发下载
  （Blob + URL.createObjectURL + a.click，记得 revokeObjectURL）；FAILED 显示 error.message + trace_id
  （JobCard 可做成 features/jobs/components/JobCard.tsx）

任务 4：补测试 features/assets/__tests__/AssetListPage.test.tsx（用 @testing-library/react，
  mock 统一请求层模块）：加载成功渲染行；请求层抛 ApiError 时错误文案含 trace_id。
  features/jobs/__tests__/JobCard.test.tsx：四状态渲染（参考 D4 卡描述）。

## 第 3 步：验收（后端先跑：python -m uvicorn app.main:app --app-dir server）

```powershell
cd apps/web
npx vitest run
npm run dev
```

浏览器走一遍：筛选→查询→勾选→导出→导出中心看到任务实时推进（相位徽章「实时」）→下载。

## 第 4 步：提交并开 PR

```powershell
git checkout -b feat/d6-C-pages
git add apps/web/src
git commit -m "feat(pages): 列表页与导出中心页接通（选择/导出/实时进度/下载）"
git push -u origin feat/d6-C-pages
```

PR 标题同名，附两张页面截图。卡住截图发群。
