# 协作规则（RULES-collab）v1.0

## 分支与提交

1. 分支命名：`<type>/d<N>-<slug>`，type ∈ feat | fix | docs | chore | test。例：`feat/d2-backend-skeleton`。
2. Commit message：`<type>(<scope>): <一句话中文说明>`。一次提交只做一件事。
3. 禁止 force push 到 main；main 永远可运行（CI 绿）。

## PR 流程

4. 每个 PR 关联当日任务卡（`docs/tasks/<角色>-D<N>.md`）；描述使用 `.github/PULL_REQUEST_TEMPLATE.md`。
5. 合并条件：CI 绿 + 至少一人 approve（队友按模板 checklist 走，允许「按卡验收」式 review）。
6. 三个角色边界：
   - **A**：核心机制 + 规格 + CI（AI 辅助实现，A 人工把关后合并）。
   - **B**：后端数据/导出执行域；**C**：前端业务 UI 与测试资产。
   - B/C 的提交必须**本人操作**（粘提示词 → 跑验收 → commit → PR）；任何人不代替他人提交。

## 契约变更流程（最重要）

7. 任何接口/事件/载荷变更：**先**提契约 PR（改 `docs/specs/*.md`，版本号 +1，变更记录登记），合入后才能动实现。
8. 实现与契约不一致视为缺陷，以契约为准修实现。

## 体量门禁

9. `python scripts/size_gate.py` 本地必须通过再提交；阈值调整需在 PR 中说明理由并登记版本。

## 每日节奏（冲刺期）

10. 每晚 20:00 定时任务产出次日 A 卡的实现与 PR；B/C 当日 22:00 前完成自己的卡或群里同步阻塞。
