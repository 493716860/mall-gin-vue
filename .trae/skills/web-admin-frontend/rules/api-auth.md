# Axios 请求与统一错误模型（P0）
统一一个业务 Axios 实例，封装 Base URL、超时、Token、请求取消和错误转换。/api/v1/admin 的 JSON 业务响应为 {code,message,data,request_id}；分页 {list,total,page,page_size}。API DTO 使用 TypeScript 类型，禁止组件拼接 URL。
错误模型至少区分 NETWORK、TIMEOUT、UNAUTHORIZED、FORBIDDEN、VALIDATION、CONFLICT、SERVER、UNKNOWN，保留 request_id 便于定位；不能把 HTTP 200 直接等同业务成功。401 并发只触发一次受控失效处理；刷新 Token 仅在后端契约明确存在时实现。403 不自动重试；非幂等写请求禁止盲目重发。可取消过期查询，防止旧响应覆盖新页面数据。文件上传/下载和第三方回调遵循实际协议，不强套 JSON。
禁止日志输出 Token、密码、支付密钥、个人敏感信息。错误提示不得泄露服务端堆栈。
