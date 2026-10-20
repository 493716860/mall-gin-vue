# 标准设计包目录
```text
feature-design/
├── README.md
├── api/
│   └── openapi.yaml
├── database/
│   ├── 001_create_tables.sql
│   └── data-dictionary.md
├── design/
│   ├── transaction.md
│   ├── state-machine.md
│   ├── permissions.md
│   └── traceability.md
└── examples/
    ├── request.json
    └── response.json
```
API 契约以 OpenAPI 为准，物理表结构以 SQL Migration 为准。示例与字典必须引用而不是另立冲突规则。
