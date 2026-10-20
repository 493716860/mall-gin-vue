---
name: mall-go-gin-engineering
description: Go Gin 微信小程序商城与运营后台轻量级生产研发规范
---
# 商城工程 Skill V3.3
适用范围：Go 1.25 + Gin + GORM + MySQL 8.4 LTS 的微信小程序商城与 Web 运营后台。优先简单、可维护、交易安全。每次修改先阅读相关规则和现有实现，不为未提出的需求引入新框架。

## 已锁定技术栈
- Go 1.25、Gin、GORM、MySQL 8.4 LTS、Redis（按需）、zap、golang-jwt、Swagger（swag）。
- 配置方式保留“Viper 或环境变量”二选一，尚未定案；在项目明确前不得擅自添加 Viper。
- 数据库结构仅通过版本化 SQL Migration 管理；生产环境禁止 GORM AutoMigrate 修改表结构。
- 前端技术栈由各自独立 Skill 管理：小程序 Vue3 + uni-app + Vite + TypeScript + Pinia；Web 后台 Vue3 + Vite + TypeScript + Element Plus。

## 强制约束
1. 经典分层：Router/Middleware → Handler → Service → Repository → Model。入口 `cmd/api/main.go`。Handler 不直连数据库；Service 组织业务及事务；Repository 负责持久化；DTO 不等于数据库 Model。
2. MySQL 所有新建表和字段必须使用中文 COMMENT；ALTER 字段必须保留中文注释；金额使用整数最小货币单位，禁止 float；按查询场景建索引和唯一约束。
3. Go 导出公共类型/函数及关键业务规则写准确、必要的中文注释；错误不得忽略；context 逐层传递；禁止把密钥硬编码。
4. JSON API 统一使用 `code`、`message`、`data`、`request_id`；分页 data 使用 `list`、`total`、`page`、`page_size`；正确使用 HTTP 状态码；业务错误码稳定。
5. 小程序与后台使用隔离的身份主体和 Token audience；默认鉴权，公开路由显式登记；后台 RBAC，用户资源归属检查；密码安全哈希；Token 过期、撤销与退出登录有效。
6. 订单、库存、支付、退款必须定义状态流转、幂等键、事务边界、并发控制；支付回调验签、核对金额及商户订单信息；不得信任客户端价格或支付状态。
7. 自有分销、有赞渠道分销、会员等级、积分和价格计算必须遵守 `rules/distribution.md`、`rules/membership.md`、`rules/pricing.md`；有赞 API 能力和交易责任未确认前不得假设其存在。
8. 商品评价和首页装修遵守 `rules/operations.md`，禁止评价越权和任意脚本渲染。
9. 不允许循环依赖、跨层绕行、在日志中记录 Token/密码/支付密钥等敏感信息。

## 按需实施
- API 初期统一 `/api/v1/mini` 与 `/api/v1/admin`；需要破坏性升级时再制定兼容方案。
- zap 结构化日志 + request_id；暂不引入全链路追踪平台。
- Redis 仅在 Token、验证码、必要业务场景使用；缓存不得作为订单与支付事实来源。
- 不默认引入 MQ、微服务、DDD、CQRS、通用规则引擎；确有业务需要时再评估。
- 只对实际使用的微信登录、支付等外部接口处理超时、重试和验签。
- 简单改动直接实现；涉及订单/支付/库存或数据迁移时先简述方案与风险。

## 不强制纳入 Skill
自动化测试覆盖率/测试质量门禁、CI/CD、部署规范、性能压测与容量规划。由人工决定；但不得省略交易正确性和安全控制。

## AI 执行步骤
读取现有实现与对应规则 → 说明必要变更 → 最小范围编码 → 自检关键安全和兼容风险 → 报告已做事项及未验证事项。禁止虚报测试结果。

有赞集成必须先确认渠道模式、实际可用接口、订单归属和佣金责任；采用自有商品接入有赞分销渠道，不将有赞作为内部商品主数据源。

技术栈细节见 `rules/technology-stack.md`。详见 `rules/` 与 `templates/`。规则冲突时以本文件为准。

V3.3 新增：`rules/ai-change-control.md`、`rules/business-decisions.md`、`rules/database-examples.md`、`rules/api-examples.md`、`examples/product-module/`。涉及修改代码必须遵守变更控制；涉及资金规则必须确认决策表。
## 职责边界（重要）
本 Skill 是工程规范，不是业务需求规格。订单、分销、有赞、会员、积分等业务细节以独立产品需求设计 Skill 及经确认需求为准。rules/distribution.md、membership.md、pricing.md、operations.md、business-decisions.md 仅保留跨业务通用的资金精度、幂等、权限、状态一致性等安全实现原则；其中示例或待确认策略不能被视为已批准业务规则。AI 不得擅自补充需求。
