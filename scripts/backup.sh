#!/bin/bash
# PostgreSQL 每日备份脚本
# 用法: ./scripts/backup.sh
# 建议加入 crontab: 0 3 * * * /opt/kaoshi/scripts/backup.sh

set -e

BACKUP_DIR="/opt/kaoshi/backups"
DB_NAME="kaoshi"
DB_USER="kaoshi"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

echo "[$(date)] 开始备份 PostgreSQL..."

mkdir -p "$BACKUP_DIR"

# 执行备份
docker exec kaoshi-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/kaoshi_$DATE.sql.gz"

# 删除过期备份
find "$BACKUP_DIR" -name "kaoshi_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] 备份完成: kaoshi_$DATE.sql.gz"
echo "[$(date)] 当前备份文件数: $(ls -1 $BACKUP_DIR/kaoshi_*.sql.gz 2>/dev/null | wc -l)"
