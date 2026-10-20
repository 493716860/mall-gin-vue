package auth

import (
 "net/http"
 "strings"
 "github.com/gin-gonic/gin"
)

// Principal 表示认证后可信任的身份信息。
type Principal struct { SubjectID string; Audience string }

// VerifyToken 必须由实际认证组件实现签名、有效期、撤销及账号状态校验。
type VerifyToken func(token string) (Principal, error)

// RequireAudience 拒绝缺失、无效或跨端使用的 Token。
func RequireAudience(verify VerifyToken, audience string) gin.HandlerFunc {
 return func(c *gin.Context) {
  header := c.GetHeader("Authorization")
  if !strings.HasPrefix(header, "Bearer ") { c.AbortWithStatus(http.StatusUnauthorized); return }
  principal, err := verify(strings.TrimPrefix(header, "Bearer "))
  if err != nil || principal.Audience != audience || principal.SubjectID == "" { c.AbortWithStatus(http.StatusUnauthorized); return }
  c.Set("principal", principal)
  c.Next()
 }
}
