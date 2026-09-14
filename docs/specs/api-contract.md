# 契约一：HTTP API 与统一响应信封

- **版本**：v1.0（2026-09-14）
- **实现方**：后端（server）必须精确实现；前端（apps/web）统一请求层按此消费。
- **变更规则**：任何改动先改本文并提契约 PR（版本号 +1），再改实现。

## 1. 统一响应信封

所有 `/api/*` JSON 响应必须符合：

```json
{ "code": 0, "message": "ok", "data": { }, "trace_id": "b7d0…" }
```

| 字段 | 类型 | 说明 |
|---|---|---|
| code | int | 业务码，`0` 为成功；非 0 见错误码表 |
| message | string | 人类可读信息，可直接透出给报障文案 |
| data | object \| null | 业务数据；错误时可为 null 或携带补充信息 |
| trace_id | string | 本次请求链路 id；透传 `X-Request-ID` 时沿用之，否则生成 |

**豁免清单**（不包信封）：`GET /healthz` 返回 `{"status":"ok"}`；`GET /api/export-jobs/{id}/download` **成功**时返回二进制文件流（失败时仍返回信封 JSON，见 §5）。

## 2. 错误码表

| code | 名称 | HTTP | data 补充 | 场景 |
|---|---|---|---|---|
| 0 | OK | 200/201 | — | 成功 |
| 1001 | INVALID_PARAM | 422 | `{"details": [...]}` | 参数校验失败 |
| 1002 | INVALID_PAYLOAD | 400 | — | 选择载荷非法（空选择集、SELECTED_IDS 超 1000、mode 缺失等） |
| 2001 | NOT_FOUND | 404 | — | 资源不存在 |
| 2002 | STATE_CONFLICT | 409 | — | 状态不允许（如下载未 DONE 的任务） |
| 3001 | EXPORT_LIMIT_EXCEEDED | 400 | `{"limit": 1000, "total": 8721}` | FILTER 命中数 − 排除数超上限 |
| 3002 | IDEMPOTENCY_CONFLICT | 409 | `{"existing_job_id": "…"}` | 同幂等键、不同载荷 |
| 3003 | JOB_FAILED | 200 | `{"error_code": "…", "error_message": "…"}` | 任务 DONE 之外，任务对象内表示执行失败（信封仍成功） |
| 4001 | FILE_EXPIRED | 410 | — | 导出文件已过期清理 |

> 约定：**任务执行失败不是 HTTP 错误**——创建/查询任务本身成功，失败体现在 job 对象的 `status=FAILED` 与 `error` 字段（code 3003 仅作错误对象内码）。

## 3. 端点总表

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/healthz` | 健康检查（豁免信封） |
| GET | `/api/assets` | 作品分页列表（筛选见 §4） |
| POST | `/api/export-jobs` | 创建导出任务（需 `Idempotency-Key` 头） |
| GET | `/api/export-jobs` | 任务分页列表（支持 `status` 过滤；`active_only=true` 为降级轮询专用） |
| GET | `/api/export-jobs/{id}` | 任务详情 |
| GET | `/api/export-jobs/{id}/download` | 下载文件（成功二进制 / 失败信封 JSON 双形状） |
| GET | `/api/events` | SSE 事件通道（见 `sse-events.md`） |

## 4. GET /api/assets

查询参数：

| 参数 | 类型 | 约束 |
|---|---|---|
| page | int ≥ 1 | 默认 1 |
| page_size | int 1–100 | 默认 20 |
| asset_type | `image`\|`video`\|`script` | 可省略 |
| status | `draft`\|`ready`\|`failed` | 可省略 |
| tag | string | 精确匹配单个标签 |
| keyword | string | 标题模糊匹配（contains） |
| created_from / created_to | ISO8601 | 闭区间 |
| sort | string | 支持 `created_at`、`-created_at`、`size_bytes`；默认 `-created_at` |

响应 `data`：

```json
{ "items": [Asset], "total": 8721, "page": 1, "page_size": 20 }
```

Asset 形状：`{ id, title, asset_type, status, tags: [string], size_bytes, created_at }`

## 5. POST /api/export-jobs 与下载

请求头：`Idempotency-Key: <uuid>`（必填）。请求体见 `selection-payload.md`（mode / filter / selected_ids / excluded_ids / format）。

响应 `data`（ExportJob 形状，所有任务端点一致）：

```json
{
  "id": "job_01H…", "status": "QUEUED", "format": "csv",
  "total_count": 0, "processed_count": 0, "progress": 0,
  "job_version": 1,
  "created_at": "…", "finished_at": null,
  "file": null, "error": null
}
```

- 幂等：同 key + 同载荷 → 返回已存在任务（HTTP 200，`data` 同形）；同 key + 不同载荷 → 3002。
- `file`：`{ "name": "export_xxx.csv", "size_bytes": 12345 } | null`；`error`：`{ "code": "3003", "message": "…" } | null`。

下载 `GET /api/export-jobs/{id}/download`：

- 成功（job 为 DONE 且文件未过期）：`200`，`Content-Type` 为文件类型，`Content-Disposition: attachment; filename*=UTF-8''…`，`X-Trace-Id` 头携带 trace_id。
- 失败：HTTP 4xx + **信封 JSON**（`Content-Type: application/json`）。前端按 `response.ok` + `Content-Type` 分支解析——这正是「二进制错误体解析回统一结构」的契约依据。

## 6. 日志与 trace_id

- 每个请求一行访问日志 + 关键业务日志，均携带 `trace_id` 字段（结构化输出）。
- 前端报障文案格式：`操作失败（trace_id: xxx）`。
