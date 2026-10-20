package response

import "github.com/gin-gonic/gin"

// Envelope 定义统一业务 JSON 响应结构。
type Envelope struct {
 Code string `json:"code"`
 Message string `json:"message"`
 Data any `json:"data"`
 RequestID string `json:"request_id"`
}

// JSON 使用统一格式返回业务响应，requestID 由请求中间件生成。
func JSON(c *gin.Context, status int, code, message string, data any) {
 requestID, _ := c.Get("request_id")
 id, _ := requestID.(string)
 c.JSON(status, Envelope{Code: code, Message: message, Data: data, RequestID: id})
}
