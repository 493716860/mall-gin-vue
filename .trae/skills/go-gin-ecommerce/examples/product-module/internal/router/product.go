package router

import (
	"example.com/mall/internal/handler"
	"github.com/gin-gonic/gin"
)

// RegisterProductRoutes 注册后台商品接口；传入的认证和授权中间件必须为真实实现。
func RegisterProductRoutes(r *gin.Engine, h *handler.ProductHandler, authAdmin gin.HandlerFunc, requireCreate gin.HandlerFunc) {
	admin := r.Group("/api/v1/admin", authAdmin)
	admin.POST("/products", requireCreate, h.Create)
	admin.GET("/products/:id", h.Get)
}
