# 契约二：SSE 事件通道与 job_version

- **版本**：v1.0（2026-09-14）
- **依赖**：`api-contract.md` 的 ExportJob 形状与错误码表。

## 1. 通道

`GET /api/events`，`Accept: text/event-stream`。响应为标准 SSE 流：

```
event: job_updated
id: 42
data: {"job_id":"job_01H…","job_version":7,"status":"RUNNING","progress":45,"total_count":8721,"processed_count":3924}

: ping
```

- `event` 取值：`job_updated` | `snapshot` | `bye`。
- `id`：**连接内**单调递增整数，用于断线重连的 `Last-Event-ID` 重放。
- 注释行 `: ping` 每 15 秒一次作心跳（中间件/代理保活）。

## 2. job_version 语义（核心）

- `job_version` 是**每个任务独立**的单调递增整数，从 1 开始。
- 任务任何可观测变更（状态迁移、进度推进、计数更新、错误落地）必须先 `job_version += 1` 再广播。
- **客户端规则（乐观锁思想）**：收到事件时若 `event.job_version <= 本地已知版本`，判定为乱序/重复事件，**直接丢弃**；仅严格大于时才应用。

## 3. 事件类型

### job_updated（增量）
`data`：`{ job_id, job_version, status, progress, total_count, processed_count, error? }`——进度增量事件，前端据此精准更新对应 job 的 query 缓存。

### snapshot（全量）
- 场景一：客户端**首次**连上（无 Last-Event-ID）。
- 场景二：重连时 `Last-Event-ID` 早于服务端重放窗口（默认保留最近 512 条事件、10 分钟）。
- `data`：`{ jobs: [ExportJob], max_job_version_map: {job_id: version} }`——一次给全所有任务最新态，客户端用版本比对整体校准。

### bye
服务端主动关闭前发送，`data`：`{"reason": "server_shutdown"}`。客户端视同断连，进入重连状态机。

## 4. 断连重连与降级轮询（服务端配合）

- 服务端必须支持 `Last-Event-ID` 请求头：重连时重放窗口内缺失的事件；窗口外则先发 `snapshot`。
- 降级轮询的数据源：`GET /api/export-jobs?active_only=true`（status ∈ {QUEUED, RUNNING}）。轮询响应中的 job 形状与 SSE 完全一致，保证前端两条通道可无缝互换。
- **最终一致策略**：SSE 仅做「通知/增量」，任何怀疑状态漂移时前端以 HTTP 查询为准校准（`invalidateQueries`）。

## 5. 页面生命周期

- 页面隐藏（`visibilitychange` → hidden）：前端主动断连；回前台：直接重连（视为一次普通断连重连）。
- 无活跃任务时（无 QUEUED/RUNNING 且无进行中的下载），前端可断开通道；出现活跃任务时重新建立。

## 6. 测试要求（对应简历「9 个场景」的最小集）

集成测试（FakeEventSource + 假时钟）至少覆盖：

1. 正常推进：事件按版本递增应用。
2. 乱序：低版本事件被丢弃。
3. 重复：相同版本事件被丢弃。
4. 退避序列 1/2/5/10 封顶。
5. 连续失败 3 次降级轮询（前台 3s）。
6. 后台轮询间隔 15s。
7. `online` 事件触发升级回 SSE。
8. 页面隐藏主动断连、回前台恢复。
9. 重连后 snapshot 校准缓存。
