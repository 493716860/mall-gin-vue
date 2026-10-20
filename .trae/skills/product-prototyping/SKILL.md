---
name: product-prototyping
version: 2.0.0
description: 企业级产品发现、业务建模、需求规格、可交互 HTML 原型、验收与交付 Skill
---
# Product Prototyping Skill V2.0
## 职责边界
本 Skill 定义业务目标、角色、流程、规则、字段、权限、交互、验收标准及变更影响；不规定 Go/Vue 工程架构、数据库物理设计或未经研发确认的接口路径。业务方确认的需求是事实来源；AI 推断必须标为假设或 TBD。
## 工作阶段（按顺序）
1. 需求发现：目标、角色、利益相关方、边界、依赖、风险和待决策项，见 rules/discovery.md。
2. 业务建模：对象、生命周期、状态机、角色与跨模块关系，见 rules/business-modeling.md。
3. 规则与规格：唯一 REQ/BR/PAGE/AC 编号、决策表、字段规格、异常/边界，见 rules/specification.md、rules/business-rules.md、rules/fields-validation.md。
4. 交互原型：完整多页面 HTML 仿真、真实可操作的演示状态与规则联动，见 rules/interaction.md、rules/html-prototype.md。
5. 验收与追踪：Given/When/Then，REQ→BR→PAGE→AC 关联，见 rules/acceptance-traceability.md。
6. 质量审查：使用 rules/quality-review.md 与 checklists/delivery-review.md；不满足阻断条件不得宣称可交付。
7. 变更与交接：执行 rules/change-impact.md、rules/handoff.md。
## P0 交付约束
- HTML 是主要人类可读交付物；用户要求单文件时必须为离线自包含 index.html。复杂需求须覆盖全部核心页面、角色、流程、异常与交互，不得只做静态图或单个新增页。
- 每个需求写清前置条件、触发、结果、例外、权限和可验证 AC；字段列出类型、必填、范围、校验时机、提示和依赖。
- 资金、佣金、积分、优惠叠加、支付/退款、库存等高风险规则必须有决策表与状态机；未确认规则标记 TBD 并在交付阻断清单显式呈现，禁止自行定案。
- 模拟数据与真实接口严格区分；原型交互必须可操作、可复位，模拟行为与规格一致。
- 变更需求须同步更新受影响页面、规则、状态、验收与版本；禁止留下互相冲突的说明。
- 可选 requirements.json 必须符合 templates/requirements.schema.json；如交付该文件，须与 HTML 同源一致。
## AI 行为
优先读取已有规格，少问但不猜高风险决策；先交付清晰范围与 TBD，再生成原型；自检并如实报告验证结果。不得宣称未执行的浏览器/交互验证已通过。
