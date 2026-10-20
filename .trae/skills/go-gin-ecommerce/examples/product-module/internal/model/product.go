package model

import "time"

// Product 是商品表映射，不作为 API DTO。
type Product struct {
	ID          uint64    `gorm:"column:id;primaryKey;autoIncrement:false"`
	ProductName string    `gorm:"column:product_name"`
	Status      uint8     `gorm:"column:status"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (Product) TableName() string { return "products" }
