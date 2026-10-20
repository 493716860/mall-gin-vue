---
name: web-admin-frontend
version: 2.0.0
description: Vue3 TypeScript Element Plus Web 运营后台企业级工程架构与代码规范
---
# Web 运营后台工程 Skill V2.0
## 职责
仅规定工程架构、编码风格、组件复用、状态、路由、请求、权限展示、安全编码、可维护性。具体页面、字段、业务流程和验收标准由产品需求设计 Skill 与经确认的需求决定。
## 锁定技术栈
Vue 3 Composition API、Vite、TypeScript、Element Plus、Pinia、Vue Router 4、Axios、ECharts、ESLint、Prettier。不擅自替换框架或引入第二套 UI、HTTP、状态管理库。
## P0 强制
1. 页面、API、组件、composables、stores、router、types 分层，禁止组件直接拼 URL 和跨模块直接改 Store。
2. script setup lang="ts"，请求/响应、Props/Emits 明确类型；外部数据校验，不使用无理由 any；关键逻辑和公共函数必要中文注释。
3. Element Plus 表格/筛选/表单/弹窗/上传遵守 rules/ui-components.md；防重复提交、状态一致性、错误提示。
4. Axios 统一实例、/api/v1/admin、统一 {code,message,data,request_id}，处理并发 401、403、超时、取消和错误类型；非幂等请求不得盲目重试。
5. Vue Router 4 动态路由必须通过组件映射白名单；路由与按钮权限仅控制前端体验，后端最终授权；登录/退出和刷新恢复处理正确。
6. Pinia 只存合理共享状态；局部 UI 状态留组件；ECharts 初始化/resize/dispose 生命周期正确。
7. 最小变更、避免过度抽象、无关重构、重复封装；不擅自设计业务规则。
## 规则索引
基础：rules/architecture.md、rules/coding.md、rules/ui-components.md、rules/ai-change-control.md、rules/integration-boundaries.md。
路由与缓存：rules/routing-permissions.md、rules/navigation-cache.md。
状态：rules/state.md。接口：rules/api-auth.md。图表：rules/charts.md。
## 不强制
CI/CD、自动化覆盖率门禁、性能压测、复杂监控、微前端。人工负责验收；交付不得虚报验证结果。
