# C 卡 · D2 —— 前端列表页静态 UI（预计 1–2 小时，可让 AI 代劳大部分）

> **你（C）今天的目标**：把「作品列表页」的静态样子搭出来（表格 + 筛选表单），数据先用假的。
> **开始条件**：等群里说「D2 代码已合入」（今晚 20:00 后 A 合入前端骨架），明早 `git pull` 最新 main 再开始。

## 第 0 步：环境确认（D1 已完成可跳过）

```powershell
cd $HOME\Desktop\py-ExportFlow
git pull
cd apps/web
npm install
npm run dev    # 浏览器打开它显示的地址，应能看到骨架首页；Ctrl+C 停止
```

## 第 1 步：让 AI 干活

在你能读仓库的 AI 工具里打开 `py-ExportFlow`，**把下面整段发给它**：

```
请阅读以下文件后 strictly 按要求实现，不要做要求以外的任何事：
- docs/specs/api-contract.md（第 4 节 Asset 形状与筛选参数）
- .rules/RULES-frontend.md（目录与组件规则）
- apps/web/src 下已有骨架的目录结构与样式约定

任务 1：新建 apps/web/src/features/assets/components/AssetTable.tsx
- 展示列：标题 / 类型 / 状态 / 标签 / 大小(格式化为 KB/MB) / 创建时间
- props 接收 assets: Asset[]（类型定义放 features/assets/types.ts，字段与契约一致）
- 类型用中文徽章展示（image=图片 video=视频 script=剧本），状态同理（draft=草稿 ready=就绪 failed=失败）

任务 2：新建 apps/web/src/features/assets/components/FilterForm.tsx
- 受控表单：关键词输入框、类型下拉（含"全部"）、状态下拉（含"全部"）、标签输入、日期范围两个 date input、「查询」和「重置」按钮
- props: value: FilterDraft, onChange(next), onSubmit()
- 不要在组件里发任何请求

任务 3：新建 apps/web/src/features/assets/mock.ts
- 导出 12 条确定性的 mock Asset 数据（各种类型/状态混合）

任务 4：改造列表页组件（apps/web/src/pages/AssetListPage.tsx）：用 FilterForm + AssetTable + mock 数据组装出完整页面；「查询」点击时把当前筛选条件 console.log 出来（仅此而已）

任务 5：新建 apps/web/src/features/assets/__tests__/AssetTable.test.tsx
- 渲染 12 条 mock，断言：行数 12、出现"图片"徽章、大小被格式化（不是原始数字）
- 遵守 .rules/RULES-testing.md
```

## 第 2 步：验收（全部要绿）

```powershell
npx vitest run
npm run dev
```

浏览器打开页面：能看到筛选表单和 12 行数据表格；点「查询」，控制台打印筛选条件。

## 第 3 步：提交并开 PR

```powershell
git checkout -b feat/d2-C-list-ui
git add apps/web/src
git commit -m "feat(assets): 列表页静态 UI（表格/筛选表单/mock 数据）"
git push -u origin feat/d2-C-list-ui
```

到仓库网页点 "Compare & pull request"，标题同名，正文按模板勾选后 Create。

## 常见问题

| 现象 | 处理 |
|---|---|
| `npm install` 很慢/失败 | `npm config set registry https://registry.npmmirror.com` 后重试 |
| vitest 报找不到文件 | 确认在 apps/web 目录执行 |
| 任何报错 | 截图发群（附你跑的命令） |
