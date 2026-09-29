# 模拟面试 · 第一轮：实现细节（五条 bullet 逐条深挖）

> 用法：遮住答案先自己说，录音回听。每题答完对照要点自查：说全了吗？有没有主动给出代码位置？

## bullet ①：SSE 断连自愈

**Q1.1 画出你的连接状态机。**
要点：connecting→connected；断连后 1s/2s 退避重连；第 3 次连续失败进入 degraded（轮询前台 3s/后台 15s）；**降级不等于放弃**——5s/10s 退避继续重试 SSE，重连成功或 online 事件即升级；页面隐藏断连停轮询、回前台全新连接。位置：`features/jobs/lib/sseConnection.ts`。

**Q1.2 EventSource 自带重连，你为什么自己写状态机？**
要点：原生重连策略不可控——无退避封顶（疯狂重试）、无降级（弱网下反复失败）、无页面生命周期管理（后台空耗）；自建后策略权在自己手里，且 FakeEventSource 注入让全部时序可测。

**Q1.3 页面隐藏时你为什么主动断连？切回来怎么恢复？**
要点：后台没人看进度，SSE 空耗连接、轮询空耗请求；visibilitychange→hidden 关连接清定时器；visible 视为一次普通重连（全新连接，重置失败计数）。

## bullet ②：job_version 与缓存一致性

**Q2.1 乱序/重复事件怎么被丢弃的？**
要点：后端保证版本严格单调（bump 单一入口）；前端 `shouldApplyEvent(known, incoming)`：严格大于才应用；丢弃时要返回原引用——React/TanStack 跳过渲染与通知。

**Q2.2 "SSE 仅通知、HTTP invalidateQueries 校准"是什么意思？为什么不全靠 SSE？**
要点：SSE 是通知通道（会丢/乱序/延迟），事实源永远是 HTTP 查询；能精准做的（原地更新）setQueryData 做，结构性变化（终态条目要移出视图）之后 invalidate 让下次渲染拉真值——最终一致。

**Q2.3 跨分页×筛选视图怎么精准更新？举个条目移除的例子。**
要点：显式遍历 QueryCache（setQueriesData 拿不到 key 是踩过的坑），按每个缓存自己的视图参数判定：activeOnly 视图里的任务变 DONE → 从 items 移除 + total-1。

## bullet ③：统一信封与 trace_id

**Q3.1 信封在哪一层实现？错误怎么归一？**
要点：后端路由分发层（自定义 APIRoute）+ 全局异常处理器四类出口（AppError/422/HTTPException/未捕获→5000）；前端统一请求层三通道归一成 ApiError{code,message,traceId}，UI 只处理一种错误形状。

**Q3.2 下载失败的"二进制错误体"是怎么回事？**
要点：成功是文件流、失败是信封 JSON 的双形状契约；前端 requestBlob 里 !ok 时读 text→JSON.parse→解析回 ApiError——用户在下载场景看到的错误和列表页错误完全同构，trace_id 同样可用。

**Q3.3 trace_id 从哪来到哪去？**
要点：透传 X-Request-Id 或生成 → request.state + ContextVar 双存（信封用/日志用）→ 响应头回传 + 信封携带 → 前端报障文案展示 → 凭号 grep 前后端日志。

## bullet ④：三态选择与幂等

**Q4.1 "全选所有筛选结果"的载荷长什么样？为什么不发 ID 列表？**
要点：`{mode:"FILTER", filter:快照, excluded_ids:[...]}`；万级规模×1000 上限枚举不成立；全选是谓词语义。

**Q4.2 幂等键怎么工作？重复点击和网络重试分别发生什么？**
要点：一个意图一个 uuid（创建意图时生成，重试复用）；后端 (key, payload_hash) 判重：同键同哈希返回原任务（重试安全），同键异哈希 3002（是 bug 不是重试）。

**Q4.3 前端拦了超限，后端为什么还拦？**
要点：防的是入口不是自己人——脚本/重放绕过 UI；TOCTOU（勾选时列表在变）；FILTER 命中数只有服务端知道。

## bullet ⑤：三层查询状态

**Q5.1 键入不触发请求，从结构上怎么保证？**
要点：draft/committed 分层 + queryKey 只含 committed——draft 根本进不了查询键，误传也只是"条件不对"不可能"键入即请求"；结构保证优于约定保证。

**Q5.2 快速翻页响应错序怎么办？**
要点：Query 按 key 隔离缓存天然防覆盖；手写场景用闭包取消标志（useEffect cleanup 置 cancelled，回调里判断再 setState）——两条路线同一问题，我都写过。
