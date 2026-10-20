package handler

import (
	"errors"
	"example.com/mall/internal/dto"
	"example.com/mall/internal/repository"
	"example.com/mall/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

// ProductHandler 只处理 HTTP 参数与响应。
type ProductHandler struct{ svc *service.ProductService }

func NewProductHandler(svc *service.ProductService) *ProductHandler { return &ProductHandler{svc: svc} }

type envelope struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Data      any    `json:"data"`
	RequestID string `json:"request_id"`
}

func reply(c *gin.Context, status int, code, msg string, data any) {
	id, _ := c.Get("request_id")
	rid, _ := id.(string)
	c.JSON(status, envelope{code, msg, data, rid})
}

// Create 接收后台新增商品请求；路由必须先完成鉴权和授权。
func (h *ProductHandler) Create(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		reply(c, http.StatusBadRequest, "INVALID_ARGUMENT", "请求参数不正确", nil)
		return
	}
	p, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		handleError(c, err)
		return
	}
	reply(c, http.StatusCreated, "SUCCESS", "创建成功", p)
}
func (h *ProductHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		reply(c, 400, "INVALID_ARGUMENT", "商品ID不正确", nil)
		return
	}
	p, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}
	reply(c, 200, "SUCCESS", "查询成功", p)
}
func handleError(c *gin.Context, err error) {
	if errors.Is(err, service.ErrInvalidProduct) {
		reply(c, 400, "INVALID_ARGUMENT", "商品参数不正确", nil)
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		reply(c, 404, "PRODUCT_NOT_FOUND", "商品不存在", nil)
		return
	}
	// 内部数据库错误不允许直接返回给客户端。
	reply(c, 500, "INTERNAL_ERROR", "系统繁忙", nil)
}
