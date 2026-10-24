#!/usr/bin/env bash
# Daily database backup with 14-day retention.
#   ./deploy/backup.sh                 (reads DATABASE_URL from .env)
# Cron example (every night at 02:30):
#   30 2 * * * cd /srv/sibamotor && ./deploy/backup.sh >> /var/log/sibamotor-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env"; exit 1; }
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL is empty in .env"; exit 1; }

DIR="${BACKUP_DIR:-/var/backups/sibamotor}"
mkdir -p "$DIR"
chmod 700 "$DIR"

FILE="$DIR/sibamotor-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump --no-owner --clean --if-exists "$DATABASE_URL" | gzip > "$FILE"
chmod 600 "$FILE"
echo "backup written: $FILE ($(du -h "$FILE" | cut -f1))"

find "$DIR" -name 'sibamotor-*.sql.gz' -mtime +14 -delete

# Restore (into an empty database):  gunzip -c FILE.sql.gz | psql "$DATABASE_URL"
