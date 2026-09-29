# D7 演示脚本：断网自愈全流程 + 万条性能（课程展示/面试自带 demo 用）

> 前置：`python -m app.seed --count 10000 --db server/exportflow.db --profile demo`（B-D6 卡）；
> 后端 `python -m uvicorn app.main:app --app-dir server`；前端 `cd apps/web && npm run dev`。

## 演示 A：正常导出链路（2 分钟）

1. 打开作品库：万条数据分页流畅；
2. 筛选"类型=视频"→ 输入过程中**打开 Network 面板**，强调：无请求发出（bullet ⑤）；
3. 点「查询」→ 一次请求；勾 2 条 → 点「全选所有筛选结果」→ 计数变为"已选全部 N 条"（bullet ④）；
4. 若命中超 1000 → 界面拦截并引导（上限防御）；
5. 点「导出 CSV」→ 跳转导出中心 → 相位徽章「实时」，进度条推进无需刷新。

## 演示 B：断网自愈（3 分钟，重头戏）

1. 导出中心开一个 RUNNING 中的任务（创建一个 FILTER 大任务）；
2. DevTools → Network → **Offline**：
   - 徽章在几秒内变为「轮询降级」；Network 面板可见 3 秒一次的 active_only 请求（bullet ①）；
   - 页面进度仍在更新（轮询在干活）；
3. **切回 Online**（或等 SSE 后台重连成功）：徽章回到「实时」，轮询请求停止——自动升级，全程零刷新；
4. 补充说明：把浏览器标签页切到后台 10 秒再回来——徽章从「未连接」自动恢复（页面生命周期管理）。

## 演示 C：trace_id 排障闭环（1 分钟）

1. 造一个失败任务（如下载一个未完成任务）；
2. 页面错误文案里的 trace_id，肉眼可见；
3. 后端终端日志 grep 同一个号：访问日志 + 错误日志同链路命中（bullet ③）。

## 演示 D：测试资产（答辩"可验证"环节）

```powershell
pytest server/tests tests -q          # 后端 36+ 
cd apps/web && npx vitest run         # 前端 63+
python scripts/size_gate.py           # 体量门禁
python scripts/e2e_smoke.py           # 真实服务器端到端
```

## 面试一句话版本

"我可以现场演示断网 30 秒：连接状态机退避重连三次后降级轮询、进度不断、网络恢复自动升级回 SSE，全程用户无感——这套行为有 10 个假时钟集成测试锁定，不是手播的。"
