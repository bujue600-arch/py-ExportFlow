# ExportFlow（py-ExportFlow）

面向内容创作者的**异步导出中心**，软件工程实践课程团队项目。以 clean-room 方式复现"导出中心"的完整链路：**FastAPI 后端（教学级完整）+ React 前端（架构级完整）**，覆盖从筛选、跨页全选、异步导出任务、SSE 实时进度、断线自愈到文件下载的端到端流程。

> **Clean-room 声明**：本项目仅依据公开的简历描述与重新设计的规格文档实现，不含任何公司源码、数据或内部文档。

## 简历五条 bullet 与仓库位置映射（面试导览）

| # | 能力点 | 前端实现（apps/web/src） | 后端契约（docs/specs） | 后端实现（server） |
|---|---|---|---|---|
| 1 | SSE 断连自愈连接状态机 | `features/jobs/lib/sseConnection.ts` | `sse-events.md` | SSE 通道 + 事件重放 |
| 2 | job_version 乱序防护 + setQueryData 精准更新 | `features/jobs/lib/jobVersion.ts` + 集成测试 | `sse-events.md` | job_version 单调递增 |
| 3 | 统一信封 + trace_id 错误归一化 | `api/client.ts`（统一请求层） | `api-contract.md` | 信封中间件 + trace_id 日志 |
| 4 | 三态跨页全选 + 幂等键 | `features/assets/lib/selection.ts`（纯函数） | `selection-payload.md` | 幂等键 + 1000 条上限 |
| 5 | 草稿/已提交/服务端镜像三层状态 | `features/assets/hooks/useListQuery.ts` | `api-contract.md`（分页/筛选） | 筛选快照查询 |

> 排期推进中逐步落地，见 `docs/plan/schedule.md` 的每日状态。

## 目录结构

```
py-ExportFlow/
├─ docs/
│  ├─ prd/PRD.md              # 需求规格（业务、用户故事、验收标准）
│  ├─ specs/                  # 三份前后端契约（接口/SSE 事件/选择载荷）
│  ├─ architecture/           # 架构方案（先于代码出现）
│  ├─ plan/schedule.md        # 一周冲刺排期与每日状态
│  └─ tasks/                  # 三人每日任务卡
├─ .rules/                    # 版本化规则文件（后端/前端/测试/协作）
├─ scripts/size_gate.py       # 源码体量门禁
├─ server/                    # FastAPI 后端（D2 起）
├─ apps/web/                  # React 前端（D2 起）
└─ .github/workflows/ci.yml   # CI：ruff + pytest + 体量门禁
```

## 快速开始（D2 起可用）

后端：

```powershell
cd server
python -m venv .venv; .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main        # http://127.0.0.1:8000/docs
```

前端：

```powershell
cd apps/web
npm install
npm run dev
```

## 协作方式（规格先行、AI 实现、人工把关）

1. **规格先行**：任何实现 PR 之前，对应契约/方案必须先合入 `docs/`（版本化）。
2. **AI 实现**：每人按 `docs/tasks/` 当日任务卡执行，可用任意 AI 编码工具，但验收命令必须本地跑绿。
3. **人工把关**：CI（ruff + pytest + 体量门禁）全绿 + 至少一人 review 后方可合并；改契约必须先提契约 PR。

## 课程对接

- 成绩构成：团队报告 + PPT 60%、个人自动化工具试用报告 30%、考勤 10%。
- 截止：2026-12-07 前提交 GitHub 个人仓库，需多人协作提交记录。
