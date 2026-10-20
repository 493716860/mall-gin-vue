# 需求到技术契约追踪
建立 REQ/BR/PAGE/AC → API-ID/operationId → DTO 字段 → TABLE/COLUMN → 事务/状态规则的映射。并非每个需求都必须产生 API 或数据库字段，但每个新 API、表和字段必须说明来源或技术必要性。追踪表标记确认状态、设计版本与差异。避免在多个文档复制同一字段定义，OpenAPI 和 Migration 分别为接口与物理结构的权威来源。
