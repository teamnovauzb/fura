# Fura — Fleet Movements & Payments

A dispatch ledger for a trucking company: log truck **movements** (where it's
going, who's driving, money given, extra spent on the road), manage trucks and
drivers, and give the owner a tamper-evident **audit trail**.

## Stack

| Layer | Choice |
|------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| UI | shadcn/ui (Radix) + Tailwind v4 — "Dispatch Ledger" theme |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | Auth.js v5 (credentials, JWT sessions) |
| Deploy | Docker Compose + Caddy (auto-HTTPS) on a VPS |

## Roles

- **Superadmin** — the owner. Full access: manages staff, edits/deletes
  movements, and is the only role that can see the audit log.
- **Admin (staff)** — adds trucks, drivers and movements. Can **create**
  movements but **cannot edit or delete** them.
- **Driver** — not a login. Drivers are records that staff pick from a list.

Authorization is enforced **server-side** in every action (see
`src/lib/guards.ts`), not by hiding buttons.

## Local development

Requires Node 20+ and a local PostgreSQL.

```bash
# 1. Install deps
npm install

# 2. Configure env — copy and edit DATABASE_URL + AUTH_SECRET
cp .env.example .env
#    AUTH_SECRET: openssl rand -base64 32

# 3. Create the schema
npx prisma migrate dev

# 4. Create the first superadmin
SEED_EMAIL=you@example.com SEED_PASSWORD='a-strong-password' npm run db:seed

# 5. Run
npm run dev          # http://localhost:3000
```

Handy scripts: `npm run db:studio` (browse data), `npm run db:migrate`
(apply migrations in prod), `npm run build`.

## Deploying to your VPS (Docker)

The VPS needs Docker + the compose plugin. Then:

```bash
# On the server, in the project directory:
cp .env.docker.example .env     # fill in real secrets, DOMAIN, ACME_EMAIL
docker compose up -d --build    # builds the app, starts db + app + caddy

# Create the first superadmin (one time):
docker compose run --rm app npm run db:seed
```

Caddy obtains HTTPS automatically once your domain's DNS points at the server
(see below). Postgres is bound to `127.0.0.1` only — never exposed publicly.

### DNS

Point an **A record** for your chosen hostname (e.g. `fleet.yourdomain.com`)
at your **VPS's public IPv4 address** — the one your hosting provider assigned,
shown in their dashboard or via `curl -4 ifconfig.me` on the server. Add a
matching **AAAA record** if the VPS has a public IPv6. Set the same hostname as
`DOMAIN` in `.env`.

## Security notes

- Passwords hashed with bcrypt (cost 12). Login responses never reveal whether
  an email exists.
- Money is stored as `Decimal(12,2)` — never floating point.
- Every create/update/delete writes an **append-only** audit entry in the same
  DB transaction as the change, so they can't drift apart. The app never
  updates or deletes audit rows.
- Recommended next steps for production: enable 2FA for the superadmin,
  rate-limit the login route, set up `pg_dump` backups, and rotate `AUTH_SECRET`.

## Project layout

```
prisma/schema.prisma         data model (users, trucks, drivers, transactions, audit_log)
src/auth.ts / auth.config.ts Auth.js setup (edge-safe split)
src/proxy.ts                 route protection (Next 16 "proxy", formerly middleware)
src/lib/guards.ts            requireUser / requireSuperadmin — the auth boundary
src/lib/audit.ts             append-only audit writer
src/app/(app)/               authenticated app: dashboard, movements, trucks, drivers, staff, audit
src/app/login/               sign-in
```
