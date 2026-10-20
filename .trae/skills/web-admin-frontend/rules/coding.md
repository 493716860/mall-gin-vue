# Vue3/TypeScript 企业级编码规范（P0）
Composition API + <script setup lang="ts">；Props/Emits、API DTO 和共享模型显式类型。外部未知数据优先 unknown 并校验，禁止无理由 any、滥用非空断言与随意 as。函数优先单一职责，复杂逻辑拆为 composable/纯工具；避免超长组件和过深嵌套。
组件 PascalCase，组合函数 useXxx，变量 camelCase，常量 UPPER_SNAKE_CASE（确为常量时），文件命名遵循项目统一约定。ESLint + Prettier 作为格式基线。公共函数与复杂关键逻辑写必要中文注释，说明原因、约束与边界，不逐行翻译。
正确清理监听、定时器、请求和第三方实例；对 Promise 异常显式处理。不得在浏览器端硬编码服务端密钥或敏感凭证。
