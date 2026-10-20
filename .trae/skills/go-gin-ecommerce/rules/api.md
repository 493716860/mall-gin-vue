# API 规范
小程序 `/api/v1/mini`，运营后台 `/api/v1/admin`。业务 JSON 响应统一 `{ "code": "SUCCESS", "message": "操作成功", "data": {}, "request_id": "..." }`。分页 data `{ "list": [], "total": 0, "page": 1, "page_size": 20 }`。使用恰当 HTTP 状态码（401 未登录、403 无权限、409 冲突、422 业务校验不通过、500 内部异常）；内部错误细节不得返回客户端。错误码集中管理，不因文案变动而变动。文件下载与微信平台回调可使用协议要求的响应格式，不能强套业务 JSON。

## API 文档
采用 swag，从 Gin Handler 的 Go 注释生成 Swagger 文档；新增和变更 API 时同步维护参数、鉴权、状态码、响应 DTO 与错误码说明。Swagger 注释不得暴露 Token、密码、支付密钥或真实用户数据。
