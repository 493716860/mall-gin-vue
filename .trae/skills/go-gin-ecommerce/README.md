# Go + Gin 商城研发 Skill V3.3

适用：自有微信小程序商城 + Web 运营后台 + 自有用户分销 + 自有商品接入有赞分销体系。

## 使用
把 `SKILL.md`、`AGENTS.md`、`rules/`、`templates/` 放入 Go 后端仓库根目录。开发时先读总控规范和涉及业务的规则。

## 约束
经典分层架构，`cmd/api/main.go`；数据库每表每字段中文注释、关键代码中文注释；统一 API 返回和鉴权；订单/库存/支付/退款幂等与一致性；会员、积分、定价、分销独立规则；有赞渠道适配和对账。

不强制 CI/CD、测试覆盖率门禁、部署与性能容量规范；不默认引入 RabbitMQ/Kafka、微服务、DDD。

`templates/` 仅为示例骨架，特别是认证代码不能未经完善直接上线。

V3.3 新增：`rules/ai-change-control.md`、`rules/business-decisions.md`、`rules/database-examples.md`、`rules/api-examples.md`、`examples/product-module/`。涉及修改代码必须遵守变更控制；涉及资金规则必须确认决策表。
## 独立部署
将本目录完整复制到目标项目的 Skill 目录，或将本目录内容（包括 SKILL.md、AGENTS.md、rules、templates、examples）复制到目标项目的规范目录。此 Skill 不依赖仓库内其他 Skill。

## 技术栈基线
Go 1.25、Gin、GORM、MySQL 8.4 LTS、Redis（按需）、zap、golang-jwt、Swagger（swag）；Viper/环境变量待定。详见 `rules/technology-stack.md`。生产环境禁用 GORM AutoMigrate 变更表结构，统一使用 SQL Migration。
