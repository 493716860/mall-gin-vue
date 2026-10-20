---
name: api-database-design
version: 2.0.0
description: 企业级 API、MySQL 数据库、模块数据所有权、事务幂等与可实施技术详细设计
---
# API 与数据库架构设计 Skill V2.0
## 定位
将已确认产品需求与现有系统约束转为可实施的 OpenAPI 3.1、MySQL 8.4 LTS Migration、数据字典、模块数据所有权、事务状态机和需求追踪。业务规则以产品规格为准；技术设计不得臆造未确认的资金、分销、积分等策略。
## 技术基线
Go 1.25 + Gin + GORM + MySQL 8.4 LTS；经典分层 Handler→Service→Repository→Model。JWT、Redis 按需、Swagger（swag）。禁止生产 AutoMigrate，所有表/字段中文 COMMENT。
## P0 方法
1. 输入审查：核对 REQ/BR/PAGE/AC、业务确认状态、现有 OpenAPI/DDL；高风险 TBD 阻断批准。
2. 需求推导：按 rules/design-methodology.md 从行为推导 API、DTO、业务对象、表、状态、事务、错误码、权限及追踪。
3. 模块边界：按 rules/module-boundaries.md 明确数据所有者、读写责任与跨模块协作；不引入 DDD。
4. API：OpenAPI 3.1 为唯一权威，统一 Envelope、分页、错误码、鉴权，复杂接口按 rules/advanced-api.md。
5. 数据库：SQL Migration 为唯一物理结构权威，关系、唯一性、快照、流水、软删、迁移按 rules/advanced-database.md。
6. 一致性：关键流程必须写清事务步骤、锁/唯一约束、幂等键、异常补偿、外部调用及对账。
7. 验收：规则、API、DDL、字典、状态与追踪互相一致，按 checklists/design-review.md 审查，人工确认后方可标记 approved。
## 设计深度
L1 简单 CRUD：OpenAPI、DDL/字段映射、权限、错误码；L2 普通流程：增加状态与异常；L3 资金/库存/支付/积分/佣金：完整事务、并发、幂等、补偿、对账。
## 规则索引
rules/intake.md、design-methodology.md、module-boundaries.md、api-contract.md、advanced-api.md、database.md、advanced-database.md、transaction-consistency.md、security.md、traceability.md、review.md、change-control.md、handoff.md。
## 示例
examples/order-creation/ 为说明性设计案例，具体业务规则均为示例假设，不能直接视为已批准的真实商城需求。
## 不强制
CI/CD、自动化测试覆盖率门禁、性能压测或微服务；人工把关。不得虚报验证与审批结果。
