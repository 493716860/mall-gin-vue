// API 统一响应类型示例
export type ApiResponse<T> = { code: string; message: string; data: T | null; request_id: string }
export type PageData<T> = { list: T[]; total: number; page: number; page_size: number }
