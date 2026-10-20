# 经典轻量前端分层（P0）
推荐 src/api、assets、components、composables、config、constants、layouts、router、stores、styles、types、utils、views、App.vue、main.ts。Views 负责页面展示交互；API 层处理网络请求；Composables 封装可复用状态逻辑；Store 管理共享状态；Components 通过 Props/Emits 通信。业务流程确有重复时才引入 services，不强制每个模块都建立 service。
禁止页面直接拼 URL、通用组件反向依赖业务页面、跨模块直接改 Store、循环依赖。现有项目不同目录应先评估，不能为了统一目录大规模无关迁移。
