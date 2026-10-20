# API 统一契约示例
小程序 `GET /api/v1/mini/products/:id`，后台 `POST /api/v1/admin/products`（必须鉴权和 `product:create` 权限）。

成功 HTTP 200：
```json
{"code":"SUCCESS","message":"操作成功","data":{"id":"10001","name":"猫粮"},"request_id":"req_001"}
```
分页 HTTP 200：
```json
{"code":"SUCCESS","message":"查询成功","data":{"list":[],"total":0,"page":1,"page_size":20},"request_id":"req_002"}
```
未登录 HTTP 401：
```json
{"code":"UNAUTHORIZED","message":"请先登录","data":null,"request_id":"req_003"}
```
参数错误 HTTP 400：
```json
{"code":"INVALID_ARGUMENT","message":"商品名称不能为空","data":null,"request_id":"req_004"}
```
错误码稳定且集中管理；403 无权限、404 不存在、409 冲突、422 业务条件不满足、500 内部错误；不得泄露 SQL 和密钥。第三方回调按对方协议返回。
