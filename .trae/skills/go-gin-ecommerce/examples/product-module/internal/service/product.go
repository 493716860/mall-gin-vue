package service

import (
	"context"
	"errors"
	"example.com/mall/internal/dto"
	"example.com/mall/internal/model"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

var ErrInvalidProduct = errors.New("invalid product")

// ProductStore 仅抽象本示例需要的数据操作。
type ProductStore interface {
	Create(context.Context, *model.Product) error
	FindByID(context.Context, uint64) (*model.Product, error)
}

// ProductService 实现商品业务规则。
type ProductService struct {
	store ProductStore
	newID func() uint64
}

func NewProductService(store ProductStore, newID func() uint64) *ProductService {
	return &ProductService{store: store, newID: newID}
}

// Create 使用后端 ID 生成器创建草稿商品。
func (s *ProductService) Create(ctx context.Context, req dto.CreateProductRequest) (*dto.ProductResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" || utf8.RuneCountInString(name) > 160 || s.newID == nil {
		return nil, ErrInvalidProduct
	}
	id := s.newID()
	if id == 0 {
		return nil, ErrInvalidProduct
	}
	now := time.Now().UTC()
	p := &model.Product{ID: id, ProductName: name, Status: 0, CreatedAt: now, UpdatedAt: now}
	if err := s.store.Create(ctx, p); err != nil {
		return nil, err
	}
	return toResponse(p), nil
}
func (s *ProductService) Get(ctx context.Context, id uint64) (*dto.ProductResponse, error) {
	if id == 0 {
		return nil, ErrInvalidProduct
	}
	p, err := s.store.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toResponse(p), nil
}
func toResponse(p *model.Product) *dto.ProductResponse {
	return &dto.ProductResponse{ID: strconv.FormatUint(p.ID, 10), Name: p.ProductName, Status: p.Status}
}
