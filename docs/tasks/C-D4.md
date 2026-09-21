# C 卡 · D4 —— 导出中心页 UI（预计 2–3 小时）

> **你（C）今天的目标**：做出「导出中心」页面：任务列表、状态徽章、进度条、下载按钮、错误展示。
> **开始条件**：D4 的 A/B 代码都已合入 main（任务 API 可用）。

## 第 1 步：让 AI 干活（整段发给能读仓库的 AI 工具）

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/specs/api-contract.md 第 5 节（ExportJob 形状、任务列表端点、下载双形状）
- .rules/RULES-frontend.md（请求走统一请求层、query key 工厂）
- apps/web/src 下已有页面与组件风格

任务 1：features/jobs/types.ts —— ExportJob 类型，字段与契约一致（status 为 'QUEUED'|'RUNNING'|'DONE'|'FAILED'）

任务 2：features/jobs/keys.ts + hooks/useJobs.ts —— GET /api/export-jobs 分页列表（暂 10 秒固定轮询，D6 由 A 换成 SSE，留 TODO 注释）

任务 3：features/jobs/components/JobCard.tsx —— 单任务卡片：
- 状态徽章配色：QUEUED 灰/RUNNING 蓝/DONE 绿/FAILED 红；RUNNING 显示进度条（processed_count/total_count）
- DONE 且 file 存在 → 「下载」按钮；FAILED → 显示 error.message + trace_id（样式同列表页错误文案）
- 时间显示 created_at/finished_at

任务 4：pages/JobCenterPage.tsx —— 组装任务列表（含简单分页），并加到路由 /jobs；列表页加一个入口链接「导出中心」

任务 5：features/jobs/__tests__/JobCard.test.tsx —— 四种状态各渲染一例，断言徽章文案/进度条出现/下载按钮出现或错误文案含 trace_id
```

## 第 2 步：验收（后端先跑起来，且已有 DONE/FAILED 各一个任务——没有就照 B-D4 卡第 2 步造一个）

```powershell
cd apps/web
npx vitest run
npm run dev
```

浏览器进 /jobs：能看到任务卡片；DONE 的可下载（点下载得到文件）；FAILED 的显示错误文案。

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d4-C-job-center
git add apps/web/src
git commit -m "feat(jobs): 导出中心页（任务卡片/进度/下载）"
git push -u origin feat/d4-C-job-center
```

PR 标题同名，附页面截图。

## 常见问题

| 现象 | 处理 |
|---|---|
| 下载点了没反应 | 看浏览器网络面板响应截图发群 |
| 任何报错 | 截图发群（附命令） |
