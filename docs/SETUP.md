# Conference-OS

A multi-conference, multi-tenant management platform — a cleaner, purpose-built
replacement for a Directus + NeonDB setup. Built to run anywhere from a single
50-person event to 500 concurrent conferences with 10k attendees each.

## Quick start

```bash
# 1. Prerequisites: Node >= 20.10, pnpm >= 9, Docker (for local infra)
corepack enable
pnpm install

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set:
#   AUTH_SECRET        node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
#   ENCRYPTION_KEY     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# DATABASE_URL / REDIS_URL / S3_* already point at the docker-compose services.

# 3. Spin up Postgres + Redis + MinIO
docker compose up -d

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed         # reference data: 21 committees, enums
pnpm db:seed:demo    # a fully populated demo conference (slug: demo-2026)

# 5. Run everything (api + web + worker in parallel)
pnpm dev
#   api    → http://localhost:3001
#   web    → http://localhost:5173
#   worker → background (BullMQ consumer)
```

Log in with the seeded super-admin (`SEED_SUPERADMIN_EMAIL` /
`SEED_SUPERADMIN_PASSWORD` from `.env`) and open the `demo-2026` conference.

## What's in the box

- **Backend** (`apps/api`) — Hono on Node 20, Drizzle ORM, Better-Auth
  (Google OAuth + email/password), Zod validation, per-request audit log.
- **Worker** (`apps/worker`) — BullMQ consumer for bulk imports, mass
  communications, report generation, and scheduled maintenance.
- **Frontend** (`apps/web`) — React 19, Vite, Tailwind 4, TanStack Query +
  Router. Light theme, same component vocabulary as the VL dashboard.
- **Database** (`packages/db`) — PostgreSQL, ~45 tables, row-level security
  as a backstop to app-layer tenancy.
- **Realtime** — Postgres `LISTEN/NOTIFY` bridged to the browser over SSE.
- **Roles** — `super_admin` / `admin` / `editor` / `viewer`.
- **Per-conference custom fields** stored in JSONB — no dynamic DDL.
- **Bulk import** — column mapping, dedupe detection, partial success, rollback.
- **Mass communications** — email / SMS / WhatsApp with per-conference,
  encrypted, pluggable providers (SMTP, Resend, SendGrid, Twilio, MSG91, Meta).
- **Soft delete** everywhere; super-admin hard purge cascades cleanly.

## Repository layout

```
apps/api          Hono backend (REST + SSE)
apps/worker       BullMQ background worker
apps/web          React frontend (TanStack Router file-based routes)
packages/db       Drizzle schema, migrations, seeds, RLS
packages/shared   Zod schemas + types shared by api / web / worker
docs/             ARCHITECTURE, SECURITY, RUNBOOK
scripts/          ops scripts (db reset, postgres init)
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full design brief,
[`docs/RUNBOOK.md`](./docs/RUNBOOK.md) for operations, and
[`docs/SECURITY.md`](./docs/SECURITY.md) for the security model.

## Common commands

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | api + web + worker in parallel                |
| `pnpm dev:api`      | API only                                      |
| `pnpm dev:web`      | Frontend only                                 |
| `pnpm dev:worker`   | Worker only                                   |
| `pnpm build`        | Production build of every package             |
| `pnpm typecheck`    | TypeScript across all packages                |
| `pnpm db:generate`  | Drizzle generates a new SQL migration         |
| `pnpm db:migrate`   | Apply pending migrations                      |
| `pnpm db:push`      | (Dev only) sync schema without migrations     |
| `pnpm db:studio`    | Drizzle Studio (DB browser)                   |
| `pnpm db:seed`      | Seed reference data (committees, enums)       |
| `pnpm db:seed:demo` | Seed demo conference + attendees/travel/etc.  |
| `pnpm db:reset`     | Drop schema + re-migrate + re-seed            |
| `pnpm fresh`        | Full wipe and rebuild                         |

## Feature pages (apps/web)

Dashboard · Attendees · Travel · Accommodation · Food & Dining · Programme ·
Helpdesk · Staff & Committees · VIP Guests · Finance & Sponsors · Messaging
Studio · Bulk Imports · Reports · Custom Fields · Members · Audit Log ·
Settings · Control Room.

## Security

- Tenancy enforced at both the app layer and the database layer (RLS via the
  `app.current_conference_id` GUC).
- Provider credentials encrypted at rest with `ENCRYPTION_KEY` (AES-256-GCM).
- Soft delete is the default; hard purge is super-admin only.
- Every mutation writes an audit entry. See [`docs/SECURITY.md`](./docs/SECURITY.md).
