# API & Database Design Skill V2.0
企业级 API 与数据库架构详细设计，适用于 Go 1.25 + Gin + GORM + MySQL 8.4 LTS 的经典分层商城。
## 核心产物
OpenAPI 3.1、SQL Migration、数据字典、模块数据所有权、状态机、事务幂等、权限、需求追踪和人工评审结论。
## 分级设计
L1 CRUD；L2 业务状态流程；L3 交易资金与库存等关键流程。按需设计，不给简单接口强加复杂文档。
## 示例
examples/order-creation/ 提供一套自洽的示例契约、DDL、事务、状态和追踪；其业务规则为演示假设，不是正式产品需求。
## 独立使用
仅检出本目录，按 AI 工具要求加载 SKILL.md 与 rules/；设计结果经人工确认后供前后端实施。
