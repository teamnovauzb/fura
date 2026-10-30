#!/usr/bin/env bash
set -euo pipefail
umask 077

INCIDENT_DIR="${1:?incident directory required}"
BACKUP_DIR="$INCIDENT_DIR/backups"
mkdir -p "$BACKUP_DIR"

tar --xattrs --acls --numeric-owner \
  --exclude='*/node_modules' \
  --exclude='*/.next/cache' \
  -czf "$BACKUP_DIR/applications-recovery.tar.gz" /var/www

tar --xattrs --acls --numeric-owner \
  -czf "$BACKUP_DIR/server-configs-secrets.tar.gz" \
  /etc/nginx /etc/letsencrypt /etc/postgresql /etc/redis /etc/ssh \
  /etc/systemd/system /etc/cron.d /etc/cron.daily /etc/cron.hourly \
  /etc/cron.weekly /etc/cron.monthly /var/spool/cron /root/.pm2/dump.pm2 \
  /root/.ssh/authorized_keys /root/.bash_history

if command -v redis-cli >/dev/null 2>&1; then
  redis-cli --rdb "$BACKUP_DIR/redis.rdb" >"$BACKUP_DIR/redis-backup.log" 2>&1 || true
fi

{
  printf 'application_backup_complete_utc=%s\n' "$(date -u -Is)"
  du -h "$BACKUP_DIR/applications-recovery.tar.gz" "$BACKUP_DIR/server-configs-secrets.tar.gz" "$BACKUP_DIR/redis.rdb" 2>/dev/null || true
} >"$BACKUP_DIR/APPLICATION_BACKUP_COMPLETE"

sha256sum "$BACKUP_DIR/applications-recovery.tar.gz" "$BACKUP_DIR/server-configs-secrets.tar.gz" >"$BACKUP_DIR/APPLICATION_SHA256SUMS"
if [[ -f "$BACKUP_DIR/redis.rdb" ]]; then
  sha256sum "$BACKUP_DIR/redis.rdb" >>"$BACKUP_DIR/APPLICATION_SHA256SUMS"
fi
chmod -R go-rwx "$BACKUP_DIR"
