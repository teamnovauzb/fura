#!/usr/bin/env bash
set -euo pipefail
umask 077

INCIDENT_DIR="${1:?incident directory required}"
BACKUP_DIR="$INCIDENT_DIR/backups"
mkdir -p "$BACKUP_DIR/postgresql"

sudo -u postgres pg_dumpall --globals-only >"$BACKUP_DIR/postgresql/globals.sql"
sudo -u postgres pg_dumpall >"$BACKUP_DIR/postgresql/cluster-all.sql"

mapfile -t DATABASES < <(sudo -u postgres psql -X -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
for database in "${DATABASES[@]}"; do
  sudo -u postgres pg_dump --format=custom --compress=9 "$database" >"$BACKUP_DIR/postgresql/${database}.dump"
  pg_restore --list "$BACKUP_DIR/postgresql/${database}.dump" >"$BACKUP_DIR/postgresql/${database}.restore-list.txt"
done

{
  date -u -Is
  sudo -u postgres psql -X -Atc "SELECT datname || '|' || pg_database_size(datname) FROM pg_database WHERE datistemplate = false ORDER BY datname;"
  for database in "${DATABASES[@]}"; do
    printf '=== %s tables ===\n' "$database"
    sudo -u postgres psql -X -d "$database" -Atc "SELECT schemaname || '.' || relname || '|' || n_live_tup FROM pg_stat_user_tables ORDER BY schemaname, relname;"
  done
} >"$BACKUP_DIR/postgresql/validation.txt" 2>&1

if command -v redis-cli >/dev/null 2>&1; then
  redis-cli --rdb "$BACKUP_DIR/redis.rdb" >"$BACKUP_DIR/redis-backup.log" 2>&1 || true
fi

tar --xattrs --acls --numeric-owner -czf "$BACKUP_DIR/var-www-full.tar.gz" /var/www
tar --xattrs --acls --numeric-owner -czf "$BACKUP_DIR/server-configs-secrets.tar.gz" \
  /etc/nginx /etc/letsencrypt /etc/postgresql /etc/redis /etc/ssh \
  /etc/systemd/system /etc/cron.d /etc/cron.daily /etc/cron.hourly \
  /etc/cron.weekly /etc/cron.monthly /var/spool/cron /root/.pm2/dump.pm2 \
  /root/.ssh/authorized_keys /root/.bash_history 2>"$BACKUP_DIR/server-configs-tar.log"

{
  printf 'backup_complete_utc=%s\n' "$(date -u -Is)"
  printf 'hostname=%s\n' "$(hostname)"
  printf 'postgres_version=%s\n' "$(sudo -u postgres psql -X -Atc 'SHOW server_version;')"
  printf 'databases=%s\n' "${DATABASES[*]}"
  du -h "$BACKUP_DIR"/* "$BACKUP_DIR/postgresql"/*
} >"$BACKUP_DIR/BACKUP_MANIFEST.txt"

find "$BACKUP_DIR" -type f ! -name SHA256SUMS -exec sha256sum '{}' \; >"$BACKUP_DIR/SHA256SUMS"
chmod -R go-rwx "$BACKUP_DIR"
