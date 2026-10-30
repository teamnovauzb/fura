#!/usr/bin/env bash
set -euo pipefail
umask 077

INCIDENT_DIR="${1:?incident directory required}"
BACKUP_DIR="$INCIDENT_DIR/backups/postgresql"
mkdir -p "$BACKUP_DIR"

PG_BIN=/usr/lib/postgresql/16/bin
mapfile -t DATABASES < <(sudo -u postgres "$PG_BIN/psql" -X -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")

for database in "${DATABASES[@]}"; do
  sudo -u postgres "$PG_BIN/pg_dump" --format=custom --compress=9 "$database" >"$BACKUP_DIR/${database}.dump"
  "$PG_BIN/pg_restore" --list "$BACKUP_DIR/${database}.dump" >"$BACKUP_DIR/${database}.restore-list.txt"
done

{
  printf 'backup_utc=%s\n' "$(date -u -Is)"
  sudo -u postgres "$PG_BIN/psql" -X -Atc "SELECT datname || '|' || pg_database_size(datname) FROM pg_database WHERE datistemplate = false ORDER BY datname;"
  for database in "${DATABASES[@]}"; do
    printf '=== %s tables ===\n' "$database"
    sudo -u postgres "$PG_BIN/psql" -X -d "$database" -Atc "SELECT schemaname || '.' || relname || '|' || n_live_tup FROM pg_stat_user_tables ORDER BY schemaname, relname;"
  done
} >"$BACKUP_DIR/validation.txt" 2>&1

find "$BACKUP_DIR" -type f ! -name DATA_SHA256SUMS -exec sha256sum '{}' \; >"$BACKUP_DIR/DATA_SHA256SUMS"
printf 'database_backup_complete_utc=%s\n' "$(date -u -Is)" >"$BACKUP_DIR/DATABASE_BACKUP_COMPLETE"
chmod -R go-rwx "$BACKUP_DIR"
