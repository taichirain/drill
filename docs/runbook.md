# 运维手册

## 1. 部署流程

### 1.1 首次部署

```bash
# 1. 克隆代码
git clone <repo-url> /opt/kaoshi
cd /opt/kaoshi

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置强密码和 JWT_SECRET

# 3. 启动基础设施
docker-compose -f deploy/docker-compose.prod.yml up -d postgres redis pgbouncer

# 4. 初始化数据库
npm ci
npm run db:migrate
npm run db:seed

# 5. 构建前端
cd frontend && npm ci && npm run build && cd ..

# 6. 启动全部服务
docker-compose -f deploy/docker-compose.prod.yml up -d
```

### 1.2 日常更新

```bash
cd /opt/kaoshi
git pull origin main
docker-compose -f deploy/docker-compose.prod.yml pull
docker-compose -f deploy/docker-compose.prod.yml up -d
```

### 1.3 回滚

```bash
cd /opt/kaoshi
docker-compose -f deploy/docker-compose.prod.yml pull ghcr.io/your-org/kaoshi:<previous-tag>
docker-compose -f deploy/docker-compose.prod.yml up -d
```

## 2. 备份策略

### 2.1 PostgreSQL 备份

```bash
# 手动备份
docker exec kaoshi-postgres pg_dump -U kaoshi kaoshi > backups/kaoshi_$(date +%Y%m%d_%H%M%S).sql

# 自动备份（crontab）
# 0 3 * * * cd /opt/kaoshi && docker exec kaoshi-postgres pg_dump -U kaoshi kaoshi | gzip > backups/kaoshi_$(date +\%Y\%m\%d).sql.gz
```

### 2.2 Redis 备份

```bash
# 触发 RDB 快照
docker exec kaoshi-redis redis-cli BGSAVE
```

### 2.3 恢复

```bash
# 从备份恢复 PostgreSQL
docker exec -i kaoshi-postgres psql -U kaoshi kaoshi < backups/kaoshi_YYYYMMDD.sql
```

## 3. 监控检查清单

| 检查项 | 命令 | 告警阈值 |
|---|---|---|
| API 健康 | `curl /api/health` | 非 200 |
| 磁盘空间 | `df -h` | > 80% |
| 内存使用 | `free -m` | > 90% |
| DB 连接数 | `docker exec kaoshi-pgbouncer psql -p 6432 pgbouncer -c "SHOW POOLS;"` | > 80 |
| Redis 内存 | `docker exec kaoshi-redis redis-cli INFO memory` | > 80% |

## 4. 常见问题

### 4.1 考试高峰期准备

1. 提前 30 分钟预热：开放登录，让学生提前进入
2. 检查 PgBouncer 连接池：`SHOW POOLS;`
3. 检查 Redis 内存和连接数
4. 确认 WORKERS=4（或按 CPU 核数调整）

### 4.2 服务宕机应急

1. 检查容器状态：`docker-compose ps`
2. 查看日志：`docker-compose logs -f --tail=100 api`
3. 重启服务：`docker-compose restart api`
4. 如数据库问题，检查 PgBouncer 和 PostgreSQL
