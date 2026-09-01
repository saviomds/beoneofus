#!/usr/bin/env bash
# Restore an apps/core data backup produced by backup.sh.
#
#   ./deploy/restore.sh <archive.tar.age> <target-dir> [age-identity-file]
#
# Example (drill into a throwaway dir — do this regularly):
#   rclone copy b2:beoneofus-core-backups/bou-core-20260901T020015Z.tar.age /tmp/
#   ./deploy/restore.sh /tmp/bou-core-20260901T020015Z.tar.age /tmp/restore-check ~/bou-backup.age-key
#
# To restore for real: stop the app, restore into the data dir, start the app.
#   docker compose stop core
#   ./deploy/restore.sh <archive> /srv/bou/data ~/bou-backup.age-key
#   docker compose start core
set -euo pipefail

archive="${1:?path to *.tar.age}"
target="${2:?target directory}"
identity="${3:-${BACKUP_AGE_IDENTITY:-$HOME/bou-backup.age-key}}"

[ -f "$archive" ] || { echo "no such archive: $archive" >&2; exit 1; }
[ -f "$identity" ] || { echo "no age identity file: $identity" >&2; exit 1; }

mkdir -p "$target"
if [ -n "$(ls -A "$target" 2>/dev/null)" ]; then
  read -r -p "Target $target is not empty. Overwrite its contents? [type YES] " ok
  [ "$ok" = "YES" ] || { echo "aborted"; exit 1; }
fi

echo "[restore] $archive  ->  $target"
age -d -i "$identity" "$archive" | tar -C "$target" -xf - --strip-components=1

echo "[restore] done. Verify integrity on next app boot (startup recovery) or via GET /api/system/health."
