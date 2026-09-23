#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR=${BACKUP_DIR:-/var/backups/tu-repe}
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/tu-repe-$STAMP.sql.gz"
docker compose -f docker-compose.prod.yml exec -T mysql mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" | gzip > "$FILE"
echo "Backup escrito en $FILE"
# Conservar 14 copias
ls -1t "$OUT_DIR"/tu-repe-*.sql.gz | tail -n +15 | xargs -r rm --
