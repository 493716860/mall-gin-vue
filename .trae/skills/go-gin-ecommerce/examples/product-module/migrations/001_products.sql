CREATE TABLE products (
 id BIGINT UNSIGNED NOT NULL COMMENT '商品主键ID',
 product_name VARCHAR(160) NOT NULL COMMENT '商品名称',
 status TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品状态：0草稿，1上架，2下架',
 created_at DATETIME(3) NOT NULL COMMENT '创建时间（UTC）',
 updated_at DATETIME(3) NOT NULL COMMENT '更新时间（UTC）',
 PRIMARY KEY (id),
 KEY idx_products_status_id (status,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品基础信息表';
