-- 示例 SQL Migration，具体文件名应按项目迁移序列调整。
CREATE TABLE sample_records (
    id BIGINT UNSIGNED NOT NULL COMMENT '记录主键ID',
    record_name VARCHAR(128) NOT NULL COMMENT '记录名称',
    created_at DATETIME(3) NOT NULL COMMENT '创建时间（UTC）',
    updated_at DATETIME(3) NOT NULL COMMENT '更新时间（UTC）',
    PRIMARY KEY (id),
    KEY idx_sample_records_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例记录表';
