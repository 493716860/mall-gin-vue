# 示例需求追踪
| 需求/规则 | API | DTO | 表/字段 | 事务/状态 | 验收 |
|---|---|---|---|---|---|
| REQ-ORDER-001 创建订单 | API-ORDER-001 / createExampleOrder | sku_id, quantity | example_orders、example_order_items | TX-ORDER-001 / PENDING_PAYMENT | AC-ORDER-001 |
| BR-ORDER-001 幂等 | API-ORDER-001 | Idempotency-Key | example_orders.user_id, idempotency_key, request_fingerprint | TX-ORDER-001 | AC-ORDER-002 |
| BR-ORDER-002 服务端定价 | API-ORDER-001 | payable_amount 响应 | example_orders.payable_amount, example_order_items.unit_price_amount | TX-ORDER-001 | AC-ORDER-003 |

AC-ORDER-001：Given 已登录且库存充足；When 提交有效请求；Then 创建待支付订单并返回服务端金额。
AC-ORDER-002：Given 同一用户相同幂等键和请求体；When 重复提交；Then 返回原订单且不重复预占库存。
AC-ORDER-003：Given 客户端不传实际价格；When 创建订单；Then 金额由后端可信商品价格计算。

以上需求、规则、验收均为示例假设，需产品方确认后才可作为真实交付依据。
