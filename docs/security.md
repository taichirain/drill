# 安全手册

## 1. 认证与授权

- JWT Secret 必须为 256 位以上随机字符串
- Access Token 15 分钟过期，Refresh Token 4 小时过期
- Redis 黑名单存储被撤销的 Token
- 密码使用 bcrypt，cost factor ≥ 12

## 2. 数据传输

- 生产环境强制 HTTPS（Nginx 配置 SSL）
- HSTS 头已启用
- CSP 限制脚本来源

## 3. 输入安全

- 所有路由使用 Fastify JSON Schema 验证
- Knex.js 参数化查询，防 SQL 注入
- Vue 模板自动转义，防 XSS

## 4. 基础设施安全

- Nginx `limit_req` + `limit_conn` 限流
- 应用层 `@fastify/rate-limit` Redis 共享限流
- Docker 容器非 root 运行
- 敏感配置通过环境变量注入

## 5. 数据保护

- 每日自动 pg_dump 备份
- WAL 连续归档
- 备份文件加密存储（建议）
- 考试数据保留策略（建议保留 4 年）

## 6. 安全审计检查表

- [ ] JWT_SECRET 已更换为强随机串
- [ ] 生产环境 NODE_ENV=production
- [ ] HTTPS 已启用
- [ ] Redis 已设置密码（如有公网暴露）
- [ ] PostgreSQL 未暴露公网端口
- [ ] 备份文件已加密或隔离存储
- [ ] 日志中无敏感信息泄露
