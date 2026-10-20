# 微信小程序平台适配
优先使用 uni API；微信专有能力确有需要时使用 wx API 适配层并检查平台。跨端差异使用 uni-app 条件编译；微信小程序执行路径不得直接依赖 window、document 或 localStorage，H5 可通过平台适配合理使用浏览器 API。pages.json、manifest.json、权限与请求域名按环境配置；前端不得存放 AppSecret、支付私钥或服务端凭证。分包、静态资源、第三方依赖应遵守实际微信小程序包体限制，不写死可能变化的数值。第三方库须确认兼容 Vue3、Vite、TypeScript 和微信小程序目标。
