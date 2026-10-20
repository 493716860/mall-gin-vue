/** 统一 API JSON 响应。 */
export type ApiResponse<T> = {
  code: string
  message: string
  data: T | null
  request_id: string
}

/** 统一分页数据。 */
export type PageData<T> = {
  list: T[]
  total: number
  page: number
  page_size: number
}
