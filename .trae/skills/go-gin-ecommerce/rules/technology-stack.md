# 后端技术栈基线（V3.3）

本文件是已确定的技术选型清单，除明确待定项外不得由 AI 自行替换。

| 层次 | 选型 | 约束 |
|---|---|---|
| Go | 1.25 | go.mod 与本地/构建环境按项目锁定具体补丁版本 |
| Web 框架 | Gin | Router/Middleware/Handler 经典分层 |
| ORM | GORM | Repository 数据访问；不以 AutoMigrate 管理生产 Schema |
| 数据库 | MySQL 8.4 LTS | InnoDB、utf8mb4、SQL Migration、每表每字段中文 COMMENT |
| 缓存 | Redis | 按需用于会话、验证码、热点缓存和限流；不作为订单资金事实源 |
| 日志 | zap | 结构化日志、request_id、敏感数据脱敏 |
| 认证 | JWT（golang-jwt） | 明确算法、密钥管理、aud/iss/exp 等校验及撤销策略；管理员 RBAC |
| API 文档 | Swagger（swag） | Go 注释生成；变更接口同步更新文档 |
| 架构 | 经典分层 | Handler → Service → Repository → Model；入口 cmd/api/main.go |

## 待确认选项
- 配置管理：Viper **或** 环境变量 + .env。未确认前遵循现有项目，不擅自引入依赖。
- Redis 使用范围根据具体业务选择，避免无必要的缓存复杂度。

## 不纳入强制规范
不要求 RabbitMQ、Kafka、微服务、DDD、自动化测试质量门禁、CI/CD、部署规范、压测与容量规划。资金安全、权限和交易一致性仍是不可豁免的代码约束。

## 前后端契约
微信小程序：Vue3 + uni-app + Vite + TypeScript + Pinia，UI（Wot Design Uni / uView）和 HTTP（Alova / 自封装）待选。
Web 运营后台：Vue3 + Vite + TypeScript + Element Plus + Pinia + Vue Router 4 + Axios + ECharts。
两端统一遵循后端的 /api/v1/mini、/api/v1/admin、JSON Envelope、错误码和鉴权协议；前端详细编码规范在各自独立 Skill 中维护。
