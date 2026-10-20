# uni-app 生命周期
区分 Vue 组件生命周期（onMounted/onUnmounted 等）与 uni-app 页面生命周期（onLoad/onShow/onHide/onUnload/onPullDownRefresh/onReachBottom）。页面参数初始化用 onLoad，页面再次可见时按需刷新用 onShow；不要把 onMounted 当作每次页面显示。页面离开时清理监听、定时器和无效请求；onHide 不等同于页面销毁。异步请求使用请求序号或取消机制避免旧响应覆盖新数据，页面卸载后不得继续修改失效状态。
组合函数中需要使用页面生命周期时遵循 uni-app 对注册时机的限制，避免在异步回调后才注册。分页刷新、下拉刷新和触底加载不得并发重复请求。
