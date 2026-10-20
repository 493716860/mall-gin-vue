# 订单、售后、分销技术详细设计

| 项目 | 内容 |
| --- | --- |
| 版本 | 0.1-draft |
| 状态 | `draft`，等待人工评审；不是 `approved` |
| 输入需求 | `docs/order-aftersales-distribution-spec.md` v0.1 |
| 原型 | `designs/mall-commerce-closed-loop-v3/` |
| 架构 | `docs/architecture.md` |
| OpenAPI | `openapi.yaml` |
| SQL | `orders/001_orders.sql`、`aftersales/001_aftersales.sql`、`distribution/001_distribution.sql` |
| 安全范围 | 未读取、复制或输出密钥、Token、密码、生产数据或配置凭据；不访问运行中的数据库 |

## 1. 输入审查与设计状态

当前仓库没有产品代码根目录中的 Go `go.mod`、`api/openapi` 契约或业务 Migration。检索到的唯一 `go.mod` 位于 Skill 自带的产品示例内，不作为本项目现状。`docs/architecture.md` 是拟定架构方案而非已实现后端。本文因此设计一组新的首版候选契约与迁移，不能称为与现有数据库兼容或已验证可执行。

| 输入 | 状态 | 设计处理 |
| --- | --- | --- |
| 产品需求 `order-aftersales-distribution-spec.md` | 评审稿；有 P0 TBD | 作为需求追踪来源；未确认的业务阈值不写成常量 |
| HTML/JS 原型 | 可操作演示，不是真实服务端 | 仅用于发现页面动作、字段和角色；不复用本地存储结构作为数据库模型 |
| Go + Gin 经典分层架构 | 已有架构方案，未发现后端工程 | 遵循 Handler → Service → Repository → Model，不引入 DDD 或微服务 |
| API 路径 | 本轮用户选择 Skill 前缀 | 本稿采用 `/api/v1/mini`、`/api/v1/admin`；须同步架构文档中 `/api/mini/v1`、`/api/admin/v1` 的旧约定 |
| 库存预占 | 本轮用户选择支付发起时预占 | 订单创建不锁库；支付意图成功启动前在库存模块原子预占。须修订架构中“创建订单时预占”的既有流程 |
| 部分退款 | 本轮用户选择按订单快照核算 | 逐商品行关联原始价格与优惠分摊；运费、退货运费及舍入策略仍为 TBD |
| 分销层级 | 本轮用户选择首版单级 | 只设计直接推广关系/佣金。须修订产品规格及架构“最多三级”承诺；不能把单级设计误称为符合原架构 |
| RBAC 明细 | TBD-14 未确认 | 定义权限点候选，不将角色绑定、双人复核或审批人组合视为已批准 |

### 1.1 设计决策记录

| DEC-ID | 决策 | 来源/状态 | 受影响内容 |
| --- | --- | --- | --- |
| DEC-01 | API 前缀采用 `/api/v1/mini` 与 `/api/v1/admin` | 用户本轮确认 | OpenAPI paths；架构文档待同步 |
| DEC-02 | 订单创建不预占；支付发起阶段预占库存 | 用户本轮确认 | 订单支付事务；与架构现有流程冲突，待架构变更记录 |
| DEC-03 | 首版推广关系和佣金仅按直接推广员（单级） | 用户本轮确认 | 分销表、佣金快照及 API；与需求规格/架构最多三级冲突，待源需求变更批准 |
| DEC-04 | 部分退款依据订单行及优惠分摊快照核算 | 用户本轮确认 | 售后退款申请、明细与数据字典 |
| DEC-05 | API/SQL 为候选首版，不运行迁移、不连接数据库 | 本次用户要求 | 所有交付物状态均保持 `draft` |

## 2. 模块所有权与经典分层

| 模块 | 写入事实 | 读取/协作 | 本设计不拥有 |
| --- | --- | --- | --- |
| `order` | 订单主记录、订单行/成交快照、优惠分摊快照、订单状态历史 | 调用 `catalog`、`pricing`、`inventory`、`payment`、`aftersales`、`distribution` 应用服务；消费支付/履约事件 | SKU 库存流水、支付交易/退款渠道记录、物流包裹、推广关系与佣金账本 |
| `aftersales` | 售后工单、售后商品行、凭证引用、售后额度占用投影、售后状态历史 | 读取 `order` 快照；请求 `payment` 建退款；通知 `inventory`、`member`、`distribution` 处理经批准的补偿 | 原支付/退款交易、订单金额快照、库存账本、佣金账本 |
| `distribution` | 申请/推广员档案、分享 token 元数据/事件、直接关系、分销规则版本、等级评估、佣金快照/账本/余额投影、提现请求/尝试、风险案例 | 调用 `member`、`order`、`aftersales`、`audit`；通过 `payment`/PayoutProvider 执行出款 | 用户身份/会员账户事实、订单/退款事实、支付凭证原文、后台审计通用表 |
| `payment`（协作域） | 支付交易、退款交易、渠道通知/尝试及最终结果 | 接受 `order`、`aftersales`、`distribution` 的应用请求；发布已验签结果 | 本稿不创建 Payment 域表、不定义微信真实回调报文 |
| `inventory`（协作域） | SKU 可用量、预占、扣减和库存流水 | 响应订单支付发起时的预占、支付成功扣减、失败/关闭释放 | 本稿不创建 Inventory 域表 |
| `audit`（协作域） | 通用管理端审计 | 接受高风险后台用例的审计写入 | 本稿不重复创建 `admin_audit_log` |

后端建议按既有架构放置：

```text
internal/modules/order/{http,application,domain,infrastructure}
internal/modules/aftersales/{http,application,domain,infrastructure}
internal/modules/distribution/{http,application,domain,infrastructure}
```

Handler 负责认证上下文、DTO 校验与响应映射；Service 编排授权、事务和应用端口；Repository 只访问模块拥有的表；Model 不直接作为 API DTO。跨模块禁止直接写对方 Model/表。

## 3. API 通用约定

- OpenAPI 3.1 YAML `openapi.yaml` 是候选 API 的唯一契约来源。小程序与后台 URL 按 DEC-01 分面；微信支付等回调不伪装成普通 JSON API。
- JSON 成功 Envelope：`code`、`message`、`data`、`request_id`；失败 Envelope 同结构，`data` 可空，`error.details` 只包含可安全展示的字段。
- 列表默认 `page=1`、`page_size=20`，最大 `page_size=100`；使用稳定排序 `created_at DESC, id DESC`。佣金流水量增长后改用游标方案需另行评审，不能静默改变契约。
- 内部 BIGINT ID 在 JSON 中均按十进制字符串返回，避免 JavaScript 安全整数精度丢失。
- 金额使用整数最小货币单位，字段名带 `_minor` 并携带 `currency`；禁止浮点金额。货币单位固定为“分”的适用范围由上线币种确认，首版默认只允许 CNY 是 TBD。
- 时间使用 UTC RFC 3339 / OpenAPI `date-time`，数据库 `DATETIME(3)` 按 UTC 存取；API 客户端负责本地化展示。
- 所有写操作要求登录/授权；创建订单、支付意图、售后申请、提现申请及可能重复的状态命令要求 `Idempotency-Key`。
- 幂等键只存 SHA-256 摘要和请求指纹，不在日志/响应中回显原始键。重复键同指纹返回首次结果；同键异指纹返回 `409 IDEMPOTENCY_KEY_REUSED`。
- OpenAPI 自定义 `x-api-id`、`x-req-ids`、`x-page-ids`、`x-permission`、`x-idempotency` 用于追踪。

### 3.1 错误映射

| HTTP | `code` | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 格式、长度、枚举或分页参数无效 |
| 401 | `UNAUTHENTICATED` | 未登录、凭证无效/过期 |
| 403 | `FORBIDDEN` | 无权限或访问非本人资源 |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在或对当前主体不可见 |
| 409 | `STATE_CONFLICT` | 当前状态不允许命令、并发版本冲突 |
| 409 | `IDEMPOTENCY_KEY_REUSED` | 相同幂等键对应不同请求指纹 |
| 422 | `BUSINESS_RULE_REJECTED` | 库存不足、售后额度不足、推广资格/提现条件不满足 |
| 429 | `RATE_LIMITED` | 登录、支付、分享、提现等限流 |
| 500 | `INTERNAL_ERROR` | 不可预期错误；不泄漏堆栈 |
| 503 | `DEPENDENCY_UNAVAILABLE` | 可恢复的下游不可用；返回 request ID，不声称交易失败/成功 |

上述错误码为设计候选，需与全局错误码表统一后冻结。

## 4. 权限矩阵候选

后台 JWT 必须独立于小程序会话。菜单权限不代替 API 鉴权；所有资源查询附加服务端数据范围与审计上下文。具体角色绑定是 TBD。

| 权限点 | 建议可执行动作 | 高风险要求 |
| --- | --- | --- |
| `order.read` | 订单列表/详情、订单事件查询 | 用户地址、电话按权限脱敏 |
| `order.close` | 关闭符合条件的未支付订单 | 原因、状态前置校验、审计 |
| `fulfillment.ship` | 创建/更新包裹及运单 | 权限由履约域确认；售后阻断校验 |
| `aftersales.read` | 售后列表/详情、凭证查看 | 凭证访问留审计；敏感信息最小化 |
| `aftersales.review` | 批准/拒绝售后 | 拒绝原因必填；是否双人复核 TBD |
| `aftersales.inspect` | 登记退货验收 | 验收证据/原因；失败后动作须已批准 |
| `aftersales.refund.request` | 为已批准工单发起退款请求 | 仅调用 Payment；不能直接置成功；审批/金额上限 TBD |
| `distribution.application.read` / `.review` | 查询、审核申请 | 审核原因和操作者审计 |
| `distribution.promoter.manage` | 启停/撤销资格 | 说明、状态历史和影响策略 TBD |
| `distribution.relation.read` / `.correct` | 查询/纠正直接关系 | 纠正需理由、前后值审计、不能成环 |
| `distribution.rules.read` / `.publish` | 查询/创建规则版本 | 发布前审批和双人复核 TBD；版本生效时间不可回写 |
| `distribution.commission.read` / `.adjust` | 查账、申请冲正 | 手工调账独立授权、凭据、双人复核 TBD |
| `distribution.payout.read` / `.review` / `.execute` | 查询、审核、执行出款 | 审核与执行分权原则建议；是否强制双人复核 TBD |
| `distribution.risk.read` / `.manage` | 查询/冻结/解冻风险对象 | 操作理由、影响范围及申诉流程 TBD |
| `audit.read` | 查看授权范围内的审计记录 | 不能改删审计事实 |

小程序权限统一为 `member` 主体；资源 ID 来自路由时仍需验证所有权，不接受请求体 `member_id` 作为授权依据。

## 5. 状态机与并发规则

### 5.1 订单与库存/支付

| 对象 | 状态/转移 | 触发及约束 |
| --- | --- | --- |
| 订单 | `pending_payment → to_ship → to_receive → completed` | 成功支付事件、履约发货/签收事件、用户确认或经确认的自动完成任务 |
| 订单 | `pending_payment → cancelled` | 用户取消或关单任务；若支付结果未知先查询 Payment，不能仅凭本地超时释放 |
| 支付 | `created → requesting → pending/paid/failed/closed/unknown` | 渠道状态由 Payment 域维护；`unknown` 不等于失败 |
| 库存预占 | `reserved → committed / released / expired` | **支付发起时**创建；支付成功扣减，明确支付失败/关单后释放；支付结果未知时保留至对账策略 |
| 订单退款汇总 | `none / partial / full / unknown`（投影） | 由 Payment 退款事件及 aftersales 关联汇总；不得覆盖订单履约状态 |

支付超时、库存保留时长、下单时可售校验与支付发起的间隔策略为 TBD。预占采用 Inventory 模块事务/条件更新并写入库存流水，不能仅依赖 Redis 锁。

### 5.2 售后

申请、审核、验收与渠道退款分别建事实。推荐状态集合：`pending_review`、`rejected`、`approved_wait_return`、`return_in_transit`、`return_received`、`inspection_failed`、`refund_processing`、`refund_unknown`、`refund_failed`、`refunded`、`cancelled`。状态集合及 `inspection_failed` 后续处置须产品确认后冻结。

- 售后行数量状态：受理时原子占用可售后数量；拒绝/获准取消时按规则释放；退款成功后转已退数量。重复申请以唯一幂等键与售后额度行锁保证不超限。
- 退款金额由 aftersales 基于订单行/优惠分摊快照产生候选明细；订单余额上限和舍入差额在服务层验证。
- 支付退款由 Payment 创建 RefundTransaction；渠道处理中/未知保持中间状态；成功/失败事件通过可靠事件交付更新售后状态。
- 退货验收失败后下一动作、退货运费、运费退款、库存回补、优惠券/积分恢复仍 TBD；不得仅凭 SQL/API 结构自行选择。

### 5.3 单级分销/佣金/提现

- 首版关系唯一约束为“一个被推广会员至多绑定一个直接推广员”；本版 `level=1`。是否允许后台纠正及关系失效对存量用户的影响 TBD。
- 佣金快照在订单创建/价格快照阶段记录候选推广人、单级规则版本和订单行引用；规则/费率有效范围未确认前，禁止发布生产佣金配置。
- 佣金生命周期：`pending → frozen → available → withdrawal_locked → withdrawn`；退款以追加负向账本流水表达，不覆写原流水。已提现后退款进入人工异常，不能自动扣款或形成负余额。
- 账户表是 ledger 的可重建投影。追加账本与投影更新在同一事务内锁账户行，使用唯一 `idempotency_key_hash`。
- 提现申请锁定可提现金额；审批、出款尝试和渠道回执分离。超时未知保持处理中并查询/对账，禁止生成新付款尝试绕开原单。
- 佣金比例精度、锁定时点、冻结期、售后阻断、最低额/限额、KYC、风控效果和双人复核均 TBD。

## 6. 事务、幂等与补偿

### 6.1 下单（L3）

1. Order Service 校验主体，调用 Catalog/Pricing/Marketing/Distribution 查询当前商品、价格、优惠和推广快照；此时**不预占库存**。
2. 同一订单创建事务中写 `orders`、`order_items`、`order_discount_allocations`、订单状态历史与幂等记录。
3. 事务提交后返回 `pending_payment`。若同一幂等键同指纹，返回原订单；指纹不同返回 409。
4. 超时/关单服务使用 `SELECT ... FOR UPDATE` 或状态版本更新，仅允许 `pending_payment` 关闭；不修改库存事实，因订单创建时未占用。
5. 订单创建阶段可售库存读取为展示/预检，不保证用户稍后发起支付时仍有货；界面应能处理支付开始失败的库存冲突。

**原子范围：** 订单域本地 MySQL 事务。禁止将外部 Pricing/微信/COS 调用放在数据库事务内。营销/分享数据快照需由受控应用接口返回，不能跨域直接读表。

### 6.2 支付发起与库存预占（L3，DEC-02）

1. Payment/Order 应用服务以 member + order + 幂等键建立支付意图，行锁读取订单并验证仍为 `pending_payment`。
2. Inventory Service 条件更新可售量并创建带过期时间的预占，操作在 Inventory 所有权事务内幂等；库存不足返回 422，不创建支付成功态。
3. 通过 Coupon/Points 域按已确认规则锁定权益（当前规则 TBD）；Payment 持久化渠道交易 intent。
4. 本地事务提交后调用微信支付 Provider；不持有 MySQL 事务等待外部网络。
5. 渠道明确拒绝：按补偿用例释放 Inventory 预占/权益锁并标记失败；渠道超时/未知：保留 intent 和必要预占，后台查询/对账，不盲目重新创建交易。
6. 合法支付成功由 Payment 验签、校验金额/商户/订单并幂等记录；发布支付成功事件。消费者分别更新 Order 投影与 Inventory 扣减，失败可重试。
7. 支付期限与预占 TTL 必须在支付/库存运营规则确认后配置，不能用本稿示例值上线。

**一致性机制：** 每个拥有事实的模块在本地事务写入业务记录与 Outbox；Inbox/业务唯一键防重复。RabbitMQ 可按架构使用，但本设计不要求跨模块分布式事务。

### 6.3 售后申请与退款（L3）

1. Aftersales 读取本人订单和订单行快照，验证支付/履约/售后资格。
2. 开启 Aftersales 本地事务，锁定 `aftersale_item_counters` 对应行，检查已占/已退数量和金额；创建 case、items、证据引用与状态历史，并更新占用数。
3. 审批操作校验 `pending_review` 和权限，记录操作者/理由；拒绝在同一事务释放该 case 对应占用。
4. 退货验收通过后依批准规则形成 refund request DTO。调用 Payment 应用服务时使用售后单号 + 退款阶段生成稳定幂等键。
5. Payment 维护真实退款事务及 Provider 交互；Aftersales 不直接写支付表、不把“请求成功”当作退款完成。
6. Payment 结果事件入 Inbox，Aftersales 本地事务去重、追加状态历史；退款成功后通过 Outbox 通知 Inventory/Member/Distribution 执行各自补偿。
7. 跨模块部分失败采用可重试事件/对账队列；不知道渠道最终结果时保留 `refund_unknown`，不释放已占额度、不重复退款。

### 6.4 佣金与提现（L3）

- 支付成功事件：Distribution 按 commission snapshot 和事件唯一键在本地事务追加 `pending` 账本，并更新账户投影。
- 确认收货/冻结到期：任务以规则版本、到期时间和售后阻断查询作为前置，锁定账户并追加 `frozen` / `available` 流水；重复任务通过唯一事件键无副作用。
- 退款冲正：以 Payment refund transaction ID + order item + promoter 组成业务去重键；不重算现价/现行费率。负余额处理路径不得自动扣款。
- 提现申请：锁 `commission_accounts`，验证可提现余额、风控、收款资料验证状态和已批准限额；在一个事务中追加 `withdrawal_locked` 流水、创建 request 与初始状态历史。
- 出款：先持久化 attempt，再调用 provider；渠道返回明确结果后更新 attempt/request 和账本。超时未知保留处理中，以同一 request/reference 查询，禁止创建重复实际付款。
- 规则金额/审批阈值及资金会计科目映射需财务确认；数据库投影不是资金账本的替代品。

## 7. 幂等与唯一约束

| 操作 | 幂等作用域/键 | 数据库保护 | 重放行为 |
| --- | --- | --- | --- |
| 创建订单 | mini member + route + `Idempotency-Key` 摘要 | `orders(member_id, create_idempotency_hash)` 唯一 | 同指纹返回原订单；异指纹 409 |
| 创建支付意图 | member + order + key | Payment 域唯一约束；订单状态版本 | 返回原支付意图；已支付/关闭返回状态冲突 |
| 微信支付回调 | Provider event/transaction ID | Payment 域通知唯一键 | 200/Provider 协议确认，不重复副作用 |
| 创建售后 | member + key | `aftersale_cases(member_id, create_idempotency_hash)` 唯一 | 返回原售后单或 409 |
| 审核/验收命令 | admin + case + action key | 状态条件更新、状态历史事件键唯一 | 重放返回当前状态；不同动作冲突 |
| 退款请求 | aftersale case + refund phase | Payment 域退款业务键唯一 | 返回同一退款请求 |
| 佣金事件 | 事件类型 + source order/item + promoter | `commission_ledger.idempotency_key_hash` 唯一 | 已处理事件不重复记账 |
| 提现申请 | member + key | request idempotency hash 唯一，账户行锁 | 返回原申请，不重复锁金额 |
| Provider 出款结果 | attempt ID/provider event ID | attempt 事件唯一键 | 仅首次变更账本，其余忽略/确认 |

幂等记录清理时长、事件重放窗口、超期重复键行为均待平台统一规范；账本/支付事实唯一键不得随普通幂等缓存一起清理。

## 8. MySQL 设计摘要

- MySQL 8.4 LTS、InnoDB、`utf8mb4`；时间使用 UTC `DATETIME(3)`。内部主键为 `BIGINT UNSIGNED AUTO_INCREMENT`，所有对外 ID 为字符串。
- 金额用 `BIGINT` 最小货币单位；数量用正整数；比例规则用分子/分母保存，避免未确认的小数精度。百分比取值范围及金额舍入方式仍 TBD。
- 一个业务事实仅由一个模块写入。跨模块 ID 作为逻辑引用，不因同库而建立跨模块写权限；同模块行可建立物理外键，删除策略为历史事实保留，不级联删除。
- 状态字段使用 `VARCHAR` 保存业务状态，Service 状态机校验迁移；不在本稿对尚未批准的售后/风险枚举写强制 CHECK。
- 所有表/字段含中文 COMMENT；金额、快照、历史及账本不可物理删除。软删除不适用于订单、售后、账本、审计历史。
- 迁移是候选的首次建表脚本，仅为文档。禁止 `AutoMigrate`；不执行、不连接、不修改现有数据库。上线前须核对真实主键、统一基表、字符集、Migration 工具与索引容量。

模块文件：

- `orders/001_orders.sql`：订单、订单行、优惠分摊快照、订单状态历史。
- `aftersales/001_aftersales.sql`：售后工单、商品行、凭证引用、商品行额度计数器、状态历史。
- `distribution/001_distribution.sql`：申请/档案、单级推广关系、分享、规则版本、佣金快照/账户/账本、提现与风险案例。

每张表的逐字段类型、COMMENT、索引、唯一键和字段来源见同目录 `data-dictionary.md`。

## 9. REQ/BR/PAGE/AC 追踪

| 产品追踪 | API-ID / OpenAPI operationId | DTO / SQL 字段 | 事务/状态 | AC |
| --- | --- | --- | --- | --- |
| REQ-ORD-01/02；BR-ORD-01/02；PAGE-MINI-ORDER | API-ORD-01 `createMiniOrder` | `CreateOrderRequest`；`orders`、`order_items`、`order_discount_allocations` | 创建订单事务；不锁库（DEC-02） | AC-ORD-01/02/03 |
| REQ-ORD-03/04；BR-ORD-03/04；PAGE-MINI-ORDER-DETAIL | API-ORD-04 `createPaymentIntent` | `CreatePaymentIntentRequest`；订单 `inventory_reservation_ref`；Payment/Inventory 自有事实不在本 Migration | 预占/支付 Saga；`pending_payment` | AC-ORD-04/05 |
| REQ-ORD-05；BR-ORD-05；PAGE-MINI-ORDERS | API-ORD-05 `cancelMiniOrder`、API-ORD-06 `confirmMiniReceipt` | `OrderCommandRequest`；`orders.status`、`order_status_history` | 状态条件更新/幂等 | AC-ORD-06 |
| REQ-ORD-06/07；BR-ORD-06/07；PAGE-ADMIN-ORDERS | API-ORD-08/09/10/11 | `OrderListItem`、`ShipmentCommand`；`orders`、`order_items`、`order_status_history` | Admin 查阅/关单；Shipment 委托履约域 | AC-ORD-07/08 |
| REQ-AFS-01/02；BR-AFS-01/02；PAGE-MINI-AFTERSALE | API-AFS-01 `createMiniAftersale` | `CreateAftersaleRequest`；`aftersale_cases/items/item_counters` | 行锁占用额度，写历史 | AC-AFS-01/02/03 |
| REQ-AFS-03/04；BR-AFS-03/04；PAGE-ADMIN-AFTERSALE-DETAIL | API-AFS-05/06 | `AftersaleReviewRequest`、`InspectionRequest`；`aftersale_cases/status_history` | 角色授权/状态前置 | AC-AFS-04/05/06 |
| REQ-AFS-05/06/07；BR-AFS-05/06/07 | API-AFS-07 `createAftersaleRefund` | `RefundRequest`；`aftersale_cases/items.refund_*` + Payment-owned `refund_transaction` | Payment 异步结果 Inbox/Outbox | AC-AFS-07/08/09/10 |
| REQ-AFS-08；BR-AFS-08；PAGE-ADMIN-AFTERSALES | API-AFS-03/04 | `AftersaleListItem`、`AftersaleDetail`；case/items/history | 分页查询/数据脱敏 | AC-AFS-11 |
| REQ-DIS-01；BR-DIS-01；PAGE-MINI-DISTRIBUTION/APPLY | API-DIS-01/02 | `CreateApplicationRequest`；`promoter_applications/profiles/status_history` | 申请幂等/审核状态机 | AC-DIS-01/02 |
| REQ-DIS-02/03；BR-DIS-02/03；PAGE-MINI-DISTRIBUTION/SHARE | API-DIS-04/05/06 | `ShareToken`、`ReferralRelation`；`share_tokens/events/referral_relations` | token 哈希验证、关系唯一；单级 DEC-03 | AC-DIS-03/04/05 |
| REQ-DIS-04；BR-DIS-04；PAGE-ADMIN-DISTRIBUTION/RULES | API-DIS-10/11 | `RuleVersionRequest`、`TierEvaluation`；tier/commission version tables | 版本发布前置/评估历史 | AC-DIS-06 |
| REQ-DIS-05/06；BR-DIS-05/06；PAGE-ADMIN-DISTRIBUTION/LEDGER | API-DIS-13/14 | `CommissionLedgerEntry`；snapshots/accounts/ledger | 账户锁+追加式流水+幂等 | AC-DIS-07/08/09 |
| REQ-DIS-07/08；BR-DIS-07/08；PAGE-MINI-DISTRIBUTION/WITHDRAW | API-DIS-08/09/15/16 | `CreatePayoutRequest`、`PayoutRequest`；profile/request/attempt/account/ledger | 锁余额；出款未知查询对账 | AC-DIS-10/11/12 |
| REQ-DIS-09/10；BR-DIS-09/10；PAGE-ADMIN-DISTRIBUTION/RISK/AUDIT | API-DIS-03/07/12/17/18 | `RiskActionRequest`、`RelationCorrectionRequest`；risk/history；审计写入 Audit 域 | RBAC/TBD、所有敏感操作审计 | AC-DIS-13/14 |

此矩阵的 API-ID 与 operationId 对应 `openapi.yaml`；表字段以 SQL Migration 与数据字典为准。页面实际字段若与规格存在差异，须走产品变更控制。

## 10. 开发阻断与人工确认清单

### 已由本轮选择，但要同步到源文档

1. API 前缀从架构稿 `/api/mini/v1`、`/api/admin/v1` 改为 `/api/v1/mini`、`/api/v1/admin`。
2. 库存从“下单预占”改为“支付发起时预占”；明确支付失败、超时未知和优惠券/积分锁定的补偿策略。
3. 首版单级分销替代需求稿和架构的最多三级；确认是否将 REQ-DIS-03/BR-DIS-02/03 的范围正式改写。
4. 部分退款按订单快照核算；仍需确定运费、退货运费、库存、积分/优惠恢复与舍入规则。

### 仍为 P0 TBD

- 支付期限、库存预占 TTL、优惠/积分权益锁定时间和恢复机制。
- 售后资格、期限、验收失败处理、部分退款运费/优惠/多次退款的精确算法。
- 推广申请资格、直接关系纠正、佣金基数/费率版本、冻结期、售后阻断。
- 提现限额、KYC/税务、渠道开通、未知/失败后对账和人工银行凭证边界。
- 风险状态对推广、佣金释放、提现的具体效果。
- 后台角色与权限绑定、敏感动作是否双人审批、用户/凭证/收款信息数据范围。
- 统一 ID/基表/时区/迁移工具约定；本项目尚无实际 Go/OpenAPI/DDL 可兼容核验。

## 11. 设计审查结果

| 检查项 | 结果 | 证据/说明 |
| --- | --- | --- |
| 需求与原型覆盖 | 部分通过 | 三域需求、页面和 AC 已追踪；P0 TBD 未完成 |
| OpenAPI 3.1 | 草案 | 含 mini/admin 操作、DTO、Envelope、权限与追踪扩展；外部支付 Provider 回调留待正式接入契约 |
| 数据所有权 | 通过（设计级） | order/aftersales/distribution 各自写入；payment/inventory/fulfillment/audit 不越权建表 |
| DDL/中文 COMMENT | 待人工/工具审查 | 每列均需中文 COMMENT；本 Migration 未连接 MySQL 验证 |
| 事务/幂等/状态 | 部分通过 | 覆盖预占、退款、佣金、提现；阈值/最终状态策略仍 TBD |
| 权限/数据隔离 | 部分通过 | 定义候选权限点；账号到权限点绑定及复核策略未确认 |
| 兼容性/迁移 | 未验证 | 无现存正式 DDL/工程约定，不能保证与未来首版工程直接兼容 |
| 涉密检查 | 按范围执行 | 未读取、复制或输出密钥、Token、密码、生产数据或凭据文件 |
| 执行/审批 | 未执行/未审批 | 未运行 SQL、未连接数据库、未生成业务实现代码；等待人工评审 |

**审查结论：** `draft / blocked-for-approval`。OpenAPI 与 Migration 可作为评审稿，不可直接交给生产或视为已经批准的接口/表结构。上述 P0 决策、架构/需求差异、OpenAPI 版本路径及目标工程基线经人工确认并同步后，方可标记 `approved`。

## 12. 变更与交接

- 本次只新增 `docs/designs/order-aftersales-distribution/` 下设计文件；不修改 `docs/architecture.md`、产品规格、Go 源码或任何数据库。
- 评审通过后，先更新产品规格和架构决策，再定版 OpenAPI/SQL；历史已执行 Migration 不得修改，只能新增前向迁移。
- 实施阶段后端按 OpenAPI/DDL/模块所有权实现；前端依据 `PAGE-ID` 和 API DTO 接入。实现发现规则歧义时回到需求决策，不以代码默认值替代业务确认。
