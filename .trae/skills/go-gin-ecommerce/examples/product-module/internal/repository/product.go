package repository

import (
    "context"
    "errors"

    "example.com/mall/internal/model"
    "gorm.io/gorm"
)

// ErrNotFound 表示记录不存在。
var ErrNotFound = errors.New("not found")

// ProductRepository 封装商品持久化。
type ProductRepository struct {
    db *gorm.DB
}

// NewProductRepository 创建商品仓储。
func NewProductRepository(db *gorm.DB) *ProductRepository {
    return &ProductRepository{db: db}
}

// Create 保存商品。
func (r *ProductRepository) Create(ctx context.Context, p *model.Product) error {
    return r.db.WithContext(ctx).Create(p).Error
}

// FindByID 按商品主键查询。
func (r *ProductRepository) FindByID(ctx context.Context, id uint64) (*model.Product, error) {
    var p model.Product
    err := r.db.WithContext(ctx).First(&p, "id = ?", id).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, err
    }
    return &p, nil
}
