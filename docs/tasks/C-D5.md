# C 卡 · D5 —— 追赶日：环境 + 列表页静态 UI（预计 2 小时）

> **你（C）今天的目标**：把欠的 D1、D2 两张卡补完。这是最后追赶窗口——明晚的卡默认你已完成今天内容。
> 说明：原 D3/D4 的卡内容（列表接数据、导出中心页）将压缩进 D6/D7 的卡里，不会丢。

## 第 1 步：补 D1 环境卡（照 docs/tasks/C-D1.md 做，含你的第一条 commit + PR）

还没做的话现在做：装 Node/Git → clone → 跑 size_gate → 写 `docs/team/C-环境确认.md` → 提交开 PR。

## 第 2 步：做 D2 静态 UI 卡（照 docs/tasks/C-D2.md 做）

补充一条（D5 新增，其余照原卡）：任务 1 的 AssetTable 增加一列**行选择复选框**：

- 每行第一列一个 checkbox，props 增加 `selectedIds: Set<string>` 和 `onToggleRow: (id: string) => void`
- 复选框勾选态由 `selectedIds.has(asset.id)` 派生（受控组件，不在表格内部存状态）
- 表头第一列也放一个 checkbox：本页全勾为 ✓、部分为 indeterminate、无勾为空（用 ref 设置 indeterminate）
- 对应测试补两条：勾选行有 data-selected="true"；混合勾选时表头 indeterminate

> 为什么现在加：明晚 D6 会把 A 已写好的 `features/assets/lib/selection.ts`（三态选择模型）和 `SelectionBar` 组件接进你的页面，行复选框是它们的落点。可以打开这两个文件先看一眼接口长什么样。

## 验收 / 提交 / PR

照 C-D2 卡第 2、3 步不变（分支名用 feat/d5-C-list-ui）。

卡住截图发群。
