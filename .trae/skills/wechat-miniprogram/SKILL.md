---
name: wechat-miniprogram
version: 1.3.0
description: Vue3 uni-app TypeScript 微信小程序前端工程架构与编码规范
---
# 微信小程序工程 Skill V1.3
仅约束架构、目录、代码风格、组件、状态、路由、请求、平台适配、安全编码与可维护性。具体业务需求、页面清单、规则和验收标准以产品需求设计 Skill 及已确认需求为准。
## 技术基线
Vue3 + uni-app + Vite + TypeScript + Pinia + uni-mini-router + UnoCSS + ESLint + Prettier。UI 库 Wot Design Uni/uView 待定；HTTP Alova/自封装 request 待定；SCSS 按需。不擅自引入或替换依赖。
## 必须遵守
1. 页面、组件、API、Store、Composables、Types 分层；禁止页面散落接口 URL、跨模块直接修改 Store。
2. Vue3 Composition API、script setup lang="ts"、明确 Props/Emits/DTO 类型，禁止无理由 any；关键代码写准确、必要的中文注释。
3. 页面生命周期、路由、Pinia、请求、微信平台适配必须遵循专项规则；清理定时器/监听，处理页面恢复与并发请求。
4. 统一请求入口与 /api/v1/mini 协议；统一处理业务响应、错误、401、超时；禁止盲目重试非幂等操作。
5. 前端可管理 UI 局部状态，但不得成为金额、库存、积分、佣金、权限、支付等业务结果的最终裁决方。
6. 最小修改、避免重复封装和过度抽象；不擅自实现未确认的业务功能。
## 规则阅读
基础：rules/architecture.md、rules/coding.md、rules/ui-ux.md、rules/ai-change-control.md、rules/integration-boundaries.md。
涉及页面：rules/lifecycle.md、rules/routing.md、rules/platform.md。
涉及状态：rules/state.md。
涉及接口：rules/api-auth.md。
## 不强制
CI/CD、覆盖率门禁、压测、复杂监控；由人工把关。交付时不得虚报验证结果。
