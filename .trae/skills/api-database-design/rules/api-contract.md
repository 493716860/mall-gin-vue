# API 契约（P0）
OpenAPI 3.1 YAML 是接口唯一权威来源；每个 operationId 稳定唯一，描述关联 API-ID、REQ-ID、权限、请求参数、DTO、成功/失败响应、错误码、分页、鉴权、幂等和状态条件。小程序 /api/v1/mini，后台 /api/v1/admin；遵循 REST 语义，正确使用 HTTP 状态码。业务 JSON Envelope 为 code/message/data/request_id；分页 data 为 list/total/page/page_size。ID 超出 JavaScript 安全整数范围时以字符串序列化。不得把数据库 Model 直接暴露为 API DTO。文件下载和外部回调按真实协议单独定义。接口变更必须评估兼容性。
