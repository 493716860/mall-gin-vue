-- 示例设计，不可直接视为真实商城生产 Migration。
CREATE TABLE example_orders (
  id BIGINT UNSIGNED NOT NULL COMMENT '订单主键ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '下单用户ID',
  idempotency_key VARCHAR(128) NOT NULL COMMENT '客户端幂等请求键',
  request_fingerprint CHAR(64) NOT NULL COMMENT '请求内容指纹SHA256',
  payable_amount BIGINT NOT NULL COMMENT '应付金额，单位分',
  order_status VARCHAR(32) NOT NULL COMMENT '订单状态',
  created_at DATETIME(3) NOT NULL COMMENT '创建时间（UTC）',
  updated_at DATETIME(3) NOT NULL COMMENT '更新时间（UTC）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_example_orders_user_key (user_id, idempotency_key),
  KEY idx_example_orders_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例订单主表';

CREATE TABLE example_order_items (
  id BIGINT UNSIGNED NOT NULL COMMENT '订单明细主键ID',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '所属订单ID',
  sku_id BIGINT UNSIGNED NOT NULL COMMENT '下单SKU主键ID',
  quantity INT UNSIGNED NOT NULL COMMENT '购买数量',
  unit_price_amount BIGINT NOT NULL COMMENT '下单商品单价，单位分',
  line_amount BIGINT NOT NULL COMMENT '明细金额，单位分',
  PRIMARY KEY (id),
  KEY idx_example_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例订单明细表';
