# Vue3 + TypeScript 代码规范
使用 Composition API 与 <script setup lang="ts">；Props 使用 defineProps、事件使用 defineEmits，暴露方法用 defineExpose（确有需要时）。明确 DTO、联合类型与可空值；默认禁止 any，外部未知数据先用 unknown 再校验。类型断言不能代替运行时校验。
组件 PascalCase，组合函数 useXxx，变量/函数 camelCase，常量 UPPER_SNAKE_CASE（仅真正固定常量）；文件命名遵循项目既有约定并保持一致。导出工具和复杂关键逻辑写必要中文注释，说明意图而非逐行翻译。遵循 ESLint + Prettier；避免过深嵌套、超长组件、无意义封装、重复代码。事件监听、计时器和异步任务及时清理。
微信小程序运行路径不能直接依赖浏览器专属 window/document/localStorage；跨端功能通过 uni API、平台适配层或条件编译处理，不禁止 H5 目标平台合理使用浏览器 API。
