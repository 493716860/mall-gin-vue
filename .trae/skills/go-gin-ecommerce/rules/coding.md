# Go 1.25 + Gin 代码规范
固定 Go 1.25；使用 Gin 作为 HTTP 框架、GORM 作为 ORM、zap 作为结构化日志库、golang-jwt 作为 JWT 实现、swag 生成 Swagger API 文档。配置在 Viper 与环境变量之间待定，未明确前不引入额外依赖。遵循 gofmt、Go 官方命名习惯。导出公共类型/函数和关键业务规则写必要中文注释，注释与行为一致。请求使用 DTO，Handler 绑定与校验参数，Service 实现业务，Repository 封装 SQL。错误必须处理并携带上下文；使用 context.Context 传递超时/取消。严禁全局可变业务状态、明文密钥、日志泄露敏感数据；避免无意义封装和提前抽象。
