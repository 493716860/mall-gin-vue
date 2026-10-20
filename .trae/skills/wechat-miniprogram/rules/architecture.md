# 前端架构与目录规范
建议 src/pages 主包、src/pages-sub 分包、src/components 通用组件、src/api 接口层、src/services 按需业务流程编排、src/stores Pinia、src/composables 组合函数、src/types 类型、src/utils 纯工具、src/constants 常量、src/styles 样式、src/static 静态资源、src/config 配置。已有项目目录不同先评估，不因目录偏好大规模迁移。
页面负责渲染与交互，组合函数复用页面逻辑，API 只处理传输协议，Store 管理合理范围的共享状态，Service 仅在多个步骤需要复用时引入。组件通过 Props/Emits 交互；禁止公共组件依赖具体页面、跨模块直接修改 Store、循环依赖和页面直接拼接 URL。不强制每个页面建立 Service。
按微信小程序实际包体限制和页面依赖决定分包，避免主包引入分包专用资源。
