# AI 开发入口
开发前必须读取 `SKILL.md` 及任务涉及的 `rules/`。经典分层、中文注释、统一响应和鉴权、交易安全不可违反。分销、有赞同步、会员、积分、价格计算、评价、首页装修必须读取对应规则。涉及有赞能力须先确认真实开放权限，不得杜撰接口。不得擅自增加 MQ、微服务、CI/CD、压测或复杂部署。不得虚报验证结果。

V3.2 新增：`rules/ai-change-control.md`、`rules/business-decisions.md`、`rules/database-examples.md`、`rules/api-examples.md`、`examples/product-module/`。涉及修改代码必须遵守变更控制；涉及资金规则必须确认决策表。
技术选型固定：Go 1.25 + Gin + GORM + MySQL 8.4 LTS + zap + golang-jwt + swag。先读 `rules/technology-stack.md`；配置管理 Viper/环境变量尚待确定。生产环境禁止 GORM AutoMigrate 改表。
