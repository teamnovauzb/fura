# Fura — Deployment Guide (for an AI agent on a fresh server)

You are deploying **Fura**, a fleet movements & payments app. Follow these
steps exactly. Do not skip the migrations or the `.env` step.

## 0. Read this first

- **This is NOT stock Next.js.** See `AGENTS.md` / `CLAUDE.md`: before writing
  or changing any code, read the relevant guide under
  `node_modules/next/dist/docs/`. For a plain deploy you don't need to change
  code — just build and run.
- Never commit or print secrets. `.env` is gitignored and is **not** in the
  repo — you must create it on this server.

## 1. Stack / prerequisites

- **Node 20** (developed on v20.20.2). Install Node 20 if missing.
- **PostgreSQL** reachable via a connection string.
- **pm2** (or systemd) to keep the process running: `npm i -g pm2`.
- **git**.

## 2. Get the code

```bash
git clone https://github.com/teamnovauzb/fura.git
cd fura
```

(Already cloned? `git pull origin main`.)

## 3. Create `.env`

Create `/path/to/fura/.env` with these keys:

```dotenv
# PostgreSQL connection (create the DB first)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/fura?schema=public"

# Auth.js (NextAuth v5). Generate a secret with:  openssl rand -base64 32
AUTH_SECRET="<random-32+-byte-string>"
# Needed when running behind a proxy / non-localhost host
AUTH_TRUST_HOST=true

# --- Optional ---
# First superadmin created by the seed script (see step 6)
SEED_NAME="Superadmin"
SEED_EMAIL="admin@example.com"
SEED_PASSWORD="<a-strong-password>"
# UI locale + fallback currency suffix (app already handles so'm/USD per entry)
# NEXT_PUBLIC_LOCALE="en-US"
```

## 4. Install dependencies

```bash
npm install
```

## 5. Database — pick ONE option

### Option A — Exact replica of the current server (recommended for parity)

This makes the new DB identical to the live one (same trucks, drivers,
movements, users). **Never commit the dump to git — it contains password
hashes and real data.** Transfer it over SSH.

**On the CURRENT server**, create the dump (does not print the password):

```bash
cd /var/www/fura
DBURL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
pg_dump "$DBURL" --no-owner --no-privileges > /tmp/fura.sql
```

Copy it to the new server (from your machine):

```bash
scp user@OLD_SERVER:/tmp/fura.sql .
scp fura.sql user@NEW_SERVER:/tmp/fura.sql
```

**On the NEW server**, create an EMPTY database, then restore into it and
generate the client. Do this BEFORE any `migrate` command:

```bash
createdb fura                         # or: psql -c 'CREATE DATABASE fura;'
psql "$DATABASE_URL" -f /tmp/fura.sql # $DATABASE_URL must point at the new DB
npx prisma generate
npx prisma migrate deploy             # will report "up to date" (dump already
                                      # has the migration history) — that's expected
```

The dump already includes every user, so **skip step 6 (seeding)**.

### Option B — Fresh empty database (no existing data)

```bash
npx prisma generate
npx prisma migrate deploy      # applies ALL migrations (ledger, trips, currency…)
```

`migrate deploy` is safe and additive. Do **not** use `migrate reset` on a DB
with real data — it wipes everything.

## 6. Create the first admin — Option B only (empty database)

```bash
npm run db:seed                # uses SEED_NAME / SEED_EMAIL / SEED_PASSWORD
```

Skip this entirely if you used Option A (the replica already has all users).
Log in, then create more staff in-app under **Staff**.

## 7. Build

```bash
npm run build
```

## 8. Run

The app serves on **port 3000** by default. Start it with pm2:

```bash
pm2 start "npm run start" --name fura
pm2 save
```

To use a different port: `PORT=8080 pm2 start "npm run start" --name fura`.

> Note: `next.config.ts` sets `output: "standalone"`. This project is run with
> `next start` (as above) and that works. If you prefer the standalone bundle,
> run `node .next/standalone/server.js` after copying `.next/static` and
> `public` into `.next/standalone/` — otherwise just use `next start`.

## 9. Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login   # expect 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/movements # expect 307 (redirects to /login)
pm2 logs fura --lines 30 --nostream
```

Open the site, sign in with the seeded credentials, and confirm the
**Movements**, **Finance**, and **Trucks** pages load.

## Updating to a new version later

```bash
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart fura
```

## Key facts about this app

- **Money is dual-currency**: every ledger entry is **so'm or USD** (default
  **USD**) and the two are **never summed together** — all totals show each
  currency separately. No exchange-rate conversion exists.
- **A movement is a multi-leg log**: it holds one or more **trips** (legs), each
  with its own route and received/spent ledger; profit sums per leg.
- **Ledger entry categories**: General / Salary / Truck. "Truck" spend and trip
  profit drive each truck's **current value** (base price + truck spend − profit).
- **Roles**: `SUPERADMIN` (full edit/delete, incl. closed trips) and `ADMIN`.
  Drivers are records only — they do not log in.
- **Audit log** is append-only; every create/update/delete is recorded.
- **i18n**: English + Uzbek (Cyrillic). Colors live in `src/app/theme.css`
  (one file; a Black & White preset is included). Font is Geist.
