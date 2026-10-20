# 页面路由与导航
页面必须在 pages.json 中正确注册；uni-mini-router 为统一路由管理方案，跳转应使用项目统一路由封装，避免散落硬编码路径。路由参数必须校验和编码，禁止在 URL 携带 Token、密钥或敏感用户资料。登录拦截保留目标页并在登录成功后安全返回；白名单页面显式声明，前端路由守卫不能替代后端权限校验。
正确区分 navigateTo、redirectTo、switchTab、reLaunch、navigateBack 的平台语义；TabBar 页面不能按普通页面方式跳转。分包页面按 pages.json 约束访问，必要时采用预加载策略但不强制。返回和重定向要避免循环跳转。
