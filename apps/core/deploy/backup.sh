#!/usr/bin/env bash
# Off-box encrypted backup of the apps/core JSON data store.
#
#   - tar the data dir  ->  age-encrypt (public key only on this box)
#   - push to an rclone remote
#   - prune local + remote copies older than BACKUP_RETENTION_DAYS
#
# Run from cron on the host, e.g.:
#   15 2 * * *  cd /srv/bou/app/apps/core && ./deploy/backup.sh >> /var/log/bou-backup.log 2>&1
#
# Requires: tar, age, rclone. Config via env or apps/core/.env (see .env.example).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$HERE/.env" ] && set -a && . "$HERE/.env" && set +a

DATA_DIR="${BOU_HOST_DATA_DIR:-/srv/bou/data}"
STAGING="${BACKUP_STAGING_DIR:-/srv/bou/backups}"
RECIPIENT="${BACKUP_AGE_RECIPIENT:?set BACKUP_AGE_RECIPIENT (age public key)}"
DEST="${BACKUP_RCLONE_DEST:?set BACKUP_RCLONE_DEST (rclone remote:path)}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$STAGING/bou-core-$ts.tar.age"

mkdir -p "$STAGING"
echo "[backup] $ts  data=$DATA_DIR  ->  $archive"

# --exclude the app's own rolling logs; keep every *.json + system/ + backups/.
tar -C "$(dirname "$DATA_DIR")" -cf - "$(basename "$DATA_DIR")" \
    --exclude='*/access.log' --exclude='*/access.log.*' \
  | age -r "$RECIPIENT" -o "$archive"

echo "[backup] uploading to $DEST"
rclone copy "$archive" "$DEST" --no-traverse

echo "[backup] pruning > ${RETENTION}d"
find "$STAGING" -name 'bou-core-*.tar.age' -mtime "+$RETENTION" -delete
rclone delete "$DEST" --min-age "${RETENTION}d" --include 'bou-core-*.tar.age' || true

echo "[backup] done"
