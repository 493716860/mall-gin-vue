# 商品模块分层模板
Router → Handler → Service → Repository → Model，DTO 独立。示例实现商品新增与查询，数据库需先运行 SQL Migration。示例不是可直接上线的完整商城模块：必须集成项目统一数据库初始化、管理员认证与 RBAC、request_id、统一响应、后端 ID 生成器。不得把示例无鉴权路由部署生产。
将 `example.com/mall` 替换为真实 module。此示例展示业务分层和错误映射，不包含库存、SKU、图片、有赞集成。第三方依赖未在本环境下载，未声称通过运行时测试。
