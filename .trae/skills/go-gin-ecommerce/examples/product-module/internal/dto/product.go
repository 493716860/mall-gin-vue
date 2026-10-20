package dto

// CreateProductRequest 是后台新增商品请求。
type CreateProductRequest struct {
	Name string `json:"name" binding:"required,max=160"`
}

// ProductResponse 是商品响应 DTO。
type ProductResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status uint8  `json:"status"`
}
