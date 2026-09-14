# 测试规则（RULES-testing）v1.0

## 通用

1. 命名：`test_<行为>_<条件>_<预期结果>`；一个用例只验证一个行为。
2. 结构：AAA（Arrange / Act / Assert），三段之间空行分隔。
3. 禁止真实睡眠：时序相关一律假时钟（前端 `vi.useFakeTimers()`；后端注入时钟）。
4. 测试不依赖执行顺序、不依赖共享可变状态；需要的夹具自己构造。

## 后端（pytest）

5. 一个路由模块对应一个 `test_<module>.py`；至少覆盖：正常路径、每个可触发的业务错误码。
6. 数据库用独立的临时 SQLite 文件（fixture 创建/销毁），禁止触碰开发库。
7. SSE 断言基于事件序列（收集后统一断言），不做实时等待。

## 前端（Vitest）

8. 纯函数测试直接断言输入输出表驱动。
9. hook 集成测试用 `renderHook` + FakeEventSource：SSE 的 9 个场景（见 `sse-events.md` §6）逐个成例。
10. 涉及 TanStack Query 的测试用 `QueryClient` 关闭 retry，避免假时钟下重试干扰断言。

## 门禁

11. CI 全绿是合并前提：`ruff check` + `pytest` + `vitest run` + `python scripts/size_gate.py`。
12. 缺陷修复必须带回归测试（先写复现用例，再修）。
