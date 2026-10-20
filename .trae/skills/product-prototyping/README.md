# Product Prototyping Skill V2.0
企业级产品需求分析、业务建模、需求规格、HTML 仿真交互原型与研发交付规范。独立于 Go/Vue 技术栈。
## 核心交付
默认 index.html（完整交互）+ README.md；按需要附 requirements.json（需符合 schema）。单文件交付时 HTML 必须离线自包含。
## 设计过程
需求发现 → 业务对象/流程/状态 → 规则决策表与字段规格 → 多页面可交互原型 → Given/When/Then → 质量评分/阻断审查 → 研发交接。
## 质量要求
评分 90+ 为评审候选，不代表业务批准；高风险规则 TBD、关键流程缺失、虚假交互等独立阻断项必须解除。详见 rules/quality-review.md。
## 独立安装
仅检出 skills/product-prototyping/，按工具要求加载 SKILL.md；避免覆盖目标项目现有 AGENTS.md。
