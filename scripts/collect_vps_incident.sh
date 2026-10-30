#!/usr/bin/env bash
set +e
umask 077

INCIDENT_DIR="${1:?incident directory required}"
mkdir -p "$INCIDENT_DIR/inventory" "$INCIDENT_DIR/evidence" "$INCIDENT_DIR/evidence/malware-samples" "$INCIDENT_DIR/logs" "$INCIDENT_DIR/config"

run_capture() {
  local output="$1"
  shift
  {
    printf 'command:'
    printf ' %q' "$@"
    printf '\n\n'
    "$@"
    printf '\nexit_code=%s\n' "$?"
  } >"$output" 2>&1
}

{
  date -u -Is
  date -Is
  hostnamectl
  uname -a
  cat /etc/os-release
  uptime
} >"$INCIDENT_DIR/inventory/host.txt" 2>&1

{
  free -h
  cat /proc/meminfo
  df -hT
  mount
  sysctl vm.nr_hugepages vm.nr_overcommit_hugepages
} >"$INCIDENT_DIR/inventory/resources.txt" 2>&1

run_capture "$INCIDENT_DIR/inventory/processes.txt" ps auxwwf
run_capture "$INCIDENT_DIR/inventory/processes_sorted_cpu.txt" ps -eo pid,ppid,user,lstart,etime,stat,comm,rss,vsz,%mem,%cpu,args --sort=-%cpu
run_capture "$INCIDENT_DIR/inventory/processes_sorted_mem.txt" ps -eo pid,ppid,user,lstart,etime,stat,comm,rss,vsz,%mem,%cpu,args --sort=-rss
run_capture "$INCIDENT_DIR/inventory/listeners.txt" ss -lntup
run_capture "$INCIDENT_DIR/inventory/connections.txt" ss -ntup
run_capture "$INCIDENT_DIR/inventory/who.txt" who -a
run_capture "$INCIDENT_DIR/inventory/last.txt" last -n 200 -aiF
run_capture "$INCIDENT_DIR/inventory/lastlog.txt" lastlog

run_capture "$INCIDENT_DIR/inventory/systemd_failed.txt" systemctl --failed --no-pager -l
run_capture "$INCIDENT_DIR/inventory/systemd_units.txt" systemctl list-units --all --no-pager -l
run_capture "$INCIDENT_DIR/inventory/systemd_unit_files.txt" systemctl list-unit-files --no-pager
run_capture "$INCIDENT_DIR/inventory/systemd_timers.txt" systemctl list-timers --all --no-pager
run_capture "$INCIDENT_DIR/inventory/services_status.txt" systemctl status ssh nginx rsyslog postgresql redis-server docker containerd pm2-root --no-pager -l

run_capture "$INCIDENT_DIR/inventory/pm2_status.txt" pm2 status
run_capture "$INCIDENT_DIR/inventory/pm2_jlist.json" pm2 jlist
cp -a /root/.pm2/dump.pm2 "$INCIDENT_DIR/config/" 2>/dev/null
cp -a /root/.pm2/logs "$INCIDENT_DIR/logs/pm2" 2>/dev/null

run_capture "$INCIDENT_DIR/inventory/nginx_test.txt" nginx -t
nginx -T >"$INCIDENT_DIR/config/nginx-expanded.txt" 2>&1
cp -a /etc/nginx "$INCIDENT_DIR/config/nginx" 2>/dev/null

run_capture "$INCIDENT_DIR/inventory/docker_ps.txt" docker ps -a --no-trunc
run_capture "$INCIDENT_DIR/inventory/docker_images.txt" docker images --no-trunc
run_capture "$INCIDENT_DIR/inventory/docker_volumes.txt" docker volume ls

{
  printf '%s\n' '=== databases ==='
  sudo -u postgres psql -X -Atc "SELECT datname || '|' || pg_database_size(datname) FROM pg_database WHERE datistemplate = false ORDER BY datname;"
  printf '%s\n' '=== roles ==='
  sudo -u postgres psql -X -Atc "SELECT rolname || '|super=' || rolsuper || '|login=' || rolcanlogin || '|createdb=' || rolcreatedb FROM pg_roles ORDER BY rolname;"
  printf '%s\n' '=== server version ==='
  sudo -u postgres psql -X -Atc 'SHOW server_version;'
} >"$INCIDENT_DIR/inventory/postgresql.txt" 2>&1

{
  find /var/www -xdev -maxdepth 4 -printf '%M %u %g %TY-%Tm-%TdT%TH:%TM:%TS %s %p\n'
  du -sh /var/www/*
  find /var/www -xdev -maxdepth 4 -name .git -type d -print
} >"$INCIDENT_DIR/inventory/applications.txt" 2>&1

while IFS= read -r git_dir; do
  repo_dir="${git_dir%/.git}"
  safe_name="$(printf '%s' "$repo_dir" | tr '/ ' '__')"
  {
    printf 'repo=%s\n' "$repo_dir"
    git -C "$repo_dir" rev-parse HEAD
    git -C "$repo_dir" status --short --branch
  } >"$INCIDENT_DIR/inventory/git-${safe_name}.txt" 2>&1
done < <(find /var/www -xdev -maxdepth 4 -name .git -type d -print)

{
  getent passwd
  printf '%s\n' '=== groups ==='
  getent group
  printf '%s\n' '=== password status ==='
  passwd -S -a
  printf '%s\n' '=== sudoers ==='
  find /etc/sudoers /etc/sudoers.d -maxdepth 2 -type f -ls
} >"$INCIDENT_DIR/inventory/accounts.txt" 2>&1

{
  sshd -T
  printf '%s\n' '=== authorized key fingerprints ==='
  find /root /home -xdev -path '*/.ssh/authorized_keys*' -type f -print -exec ssh-keygen -lf '{}' \;
} >"$INCIDENT_DIR/config/ssh-effective.txt" 2>&1
cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.d "$INCIDENT_DIR/config/" 2>/dev/null

{
  printf '%s\n' '=== root crontab ==='
  crontab -l
  printf '%s\n' '=== cron filesystem ==='
  find /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly /var/spool/cron -maxdepth 3 -type f -ls
  printf '%s\n' '=== at jobs ==='
  atq
} >"$INCIDENT_DIR/config/persistence.txt" 2>&1
cp -a /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly /var/spool/cron "$INCIDENT_DIR/config/cron" 2>/dev/null
cp -a /etc/systemd/system "$INCIDENT_DIR/config/systemd-system" 2>/dev/null
cp -a /etc/sysctl.conf /etc/sysctl.d "$INCIDENT_DIR/config/" 2>/dev/null
cp -a /etc/rsyslog.conf /etc/rsyslog.d "$INCIDENT_DIR/config/" 2>/dev/null

{
  find /etc /usr/local /root /tmp /dev/shm -xdev -type f -newermt '2026-07-10 00:00:00' -printf '%M %u %g %TY-%Tm-%TdT%TH:%TM:%TS %s %p\n'
} >"$INCIDENT_DIR/inventory/recent-files.txt" 2>&1

{
  dpkg -V
  printf '%s\n' '=== dash/bash files ==='
  ls -la /bin/sh /usr/bin/sh /bin/dash /usr/bin/dash /bin/bash /usr/bin/bash
  dpkg-query -W dash bash openssh-server rsyslog nginx postgresql redis-server
} >"$INCIDENT_DIR/inventory/package-integrity.txt" 2>&1

journalctl --since '2026-07-10 00:00:00' --no-pager >"$INCIDENT_DIR/logs/journal-since-provisioning.txt" 2>&1
journalctl -k --since '2026-07-10 00:00:00' --no-pager >"$INCIDENT_DIR/logs/kernel-since-provisioning.txt" 2>&1
journalctl -u ssh --since '2026-07-10 00:00:00' --no-pager >"$INCIDENT_DIR/logs/ssh-since-provisioning.txt" 2>&1
cp -a /var/log/nginx "$INCIDENT_DIR/logs/" 2>/dev/null
cp -a /var/log/apt "$INCIDENT_DIR/logs/" 2>/dev/null
cp -a /var/log/auth.log* /var/log/syslog* "$INCIDENT_DIR/logs/" 2>/dev/null

for pid in 231591 409322 737; do
  if [[ -d "/proc/$pid" ]]; then
    proc_dir="$INCIDENT_DIR/evidence/proc-$pid"
    mkdir -p "$proc_dir"
    ps -p "$pid" -o pid,ppid,lstart,etime,user,stat,comm,args >"$proc_dir/ps.txt" 2>&1
    readlink -f "/proc/$pid/exe" >"$proc_dir/exe-path.txt" 2>&1
    tr '\0' '\n' <"/proc/$pid/cmdline" >"$proc_dir/cmdline.txt" 2>&1
    tr '\0' '\n' <"/proc/$pid/environ" >"$proc_dir/environ.txt" 2>&1
    cp "/proc/$pid/maps" "$proc_dir/maps.txt" 2>/dev/null
    cp "/proc/$pid/status" "$proc_dir/status.txt" 2>/dev/null
    cp "/proc/$pid/limits" "$proc_dir/limits.txt" 2>/dev/null
  fi
done

for sample in /tmp/.w/moneroocean/xmrig /tmp/.w/moneroocean/config.json /dev/shm/707499379; do
  if [[ -e "$sample" ]]; then
    {
      stat "$sample"
      file "$sample"
      sha256sum "$sample"
    } >>"$INCIDENT_DIR/evidence/malware-metadata.txt" 2>&1
    cp -a "$sample" "$INCIDENT_DIR/evidence/malware-samples/" 2>/dev/null
  fi
done
chmod -R a-rwx "$INCIDENT_DIR/evidence/malware-samples" 2>/dev/null

{
  grep -R -n -E 'moneroocean|xmrig|707499379|/tmp/\.w|/dev/shm' /etc /root /var/spool/cron 2>/dev/null
  grep -R -n -E 'nr_hugepages|hugepages' /etc 2>/dev/null
} >"$INCIDENT_DIR/evidence/persistence-search.txt" 2>&1

cp -a /root/.bash_history "$INCIDENT_DIR/evidence/root-bash-history" 2>/dev/null
sha256sum "$INCIDENT_DIR/evidence/root-bash-history" >"$INCIDENT_DIR/evidence/root-bash-history.sha256" 2>/dev/null

find "$INCIDENT_DIR" -type f ! -name SHA256SUMS -exec sha256sum '{}' \; >"$INCIDENT_DIR/SHA256SUMS"
printf 'collection_complete_utc=%s\n' "$(date -u -Is)" >"$INCIDENT_DIR/COLLECTION_COMPLETE"
