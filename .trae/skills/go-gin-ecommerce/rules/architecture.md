# 经典分层架构
入口 `cmd/api/main.go`，`internal/router`、`middleware`、`handler/{mini,admin}`、`service`、`repository`、`model`、`dto`、`config`、`common`。依赖方向 Handler→Service→Repository→Model；Router 组装依赖。跨业务功能通过 Service 协调，禁止 Handler 直接调用 Repository。禁止循环依赖；不强制每个层都有 interface。
