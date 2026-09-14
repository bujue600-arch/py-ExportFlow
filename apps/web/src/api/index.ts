/**
 * 统一请求层（D3 实现，架构见 docs/architecture/frontend.md §5）。
 *
 * 届时职责：
 * - 信封结构校验（形状不对按 5000 处理）
 * - 错误归一化：业务错误/HTTP 错误/二进制错误体 → ApiError { code, message, traceId }
 * - Idempotency-Key 注入（创建导出）
 *
 * 规则：组件禁止裸 fetch，一切请求从本模块发起（RULES-frontend #4）。
 */
export {};
