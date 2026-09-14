# A 卡 · D2（09-14 晚 双端骨架日）—— 完成日志与把关清单

## 当日产出

| 产出 | 位置 | 验收 |
|---|---|---|
| 前端架构方案 v1.0（先于代码） | `docs/architecture/frontend.md` | — |
| 契约 v1.1（新增 5000 错误码，先于实现提交） | `docs/specs/api-contract.md` | — |
| 后端骨架：信封路由/异常归一/trace_id/日志 | `server/app/`（278 行） | pytest 8 项全绿 |
| 前端骨架：Vite+React+TS strict+Query+Router+Vitest | `apps/web/` | vitest + tsc build 绿 |
| CI 双流水线（后端 ruff/gate/pytest；前端 vitest/build） | `.github/workflows/ci.yml` | 待 PR 触发验证 |

本地全绿：`ruff ✓ / size_gate ✓（server 13.9%）/ pytest 14 passed / vitest 1 passed / build ✓`

## 过程中真实发生的一件事（面试故事素材）

`isinstance(response, JSONResponse)` 判断信封包装，被 FastAPI 的隐式行为打脸：**路由带返回类型注解时注解被当作 response_model，响应对象变成裸 Response**，信封漏包。已改为按 `media_type + body 存在性` 判断。详细复盘见讲解 §4.2。

## 把关清单（今晚请过目，约 15 分钟）

1. **读 `docs/architecture/frontend.md` §2–3**（目录分层与数据流图）——这是你 D3–D6 每天都在里面写代码的地图，有异议今晚提，明天改起来就贵了。
2. **信封的实现位置**：看完讲解 §4 你能复述"为什么在路由层包、中间件改 body 有什么坑"吗？复述不出来就再读一遍 §4——这是 Q1 的标准答案。
3. **契约 v1.1 的 diff**（`git show a81a0b4`）：一个错误码的增补也要先改契约再写代码——这条流程线就是简历「规格先行」的 git 物证，看一眼 commit 顺序感受下。

## 面试讲解点（今天你该带走的）

1. 装饰器 = 高阶函数注册（对照 HOC），FastAPI 用它实现"类型即文档"；
2. 错误形状统一是**前后端共同契约**，前端只处理一种 ApiError 的前提在后端；
3. ContextVar ≈ AsyncLocalStorage，trace_id 一号三处（响应头/体/日志）。

## 队友侧

- B-D2 / C-D2 卡已在仓库（数据层+种子 / 列表页静态 UI），等他们完成 D1 环境卡即可开工；
- A 的 D2 PR 已创建，明天 D3 开工前先合并。
