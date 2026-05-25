# SavdoCRM — agent guide

Retail CRM SaaS for small/medium businesses in Uzbekistan (Instagram/Telegram shops, clothing, electronics, cosmetics). Working name: **SavdoCRM**.

## Repo layout (npm workspaces)

```
apps/
  api/       NestJS 10 REST API — auth, customers, orders, products, inventory, reports, team
  web/       Next.js 14 App Router UI — Tailwind + next-intl (ru, uz-Latn)
packages/
  db/        Prisma 5 schema + generated client (@savdo/db)
```

## MVP scope (don't exceed this)

Auth · Dashboard · Customers · Orders · Products · Inventory · Basic reports · Roles.

**Not in MVP:** Telegram bot, courier integrations, POS, full ERP, advanced analytics. If a feature request lands outside MVP, surface that explicitly before building it.

## Non-negotiable rules

- **Multi-tenancy:** every tenant-scoped table carries `storeId`. Any Prisma query against tenant data without a `where: { storeId }` clause is a bug. Tenant context is extracted from the JWT in a NestJS guard and exposed via `@CurrentTenant()`.
- **i18n from day one:** all user-facing strings live in `apps/web/messages/{ru,uz}.json`. No hardcoded Russian. Default locale `ru`.
- **Currency:** UZS, not USD. Format with locale-aware thousands separator.
- **Auth:** custom JWT for MVP (no Clerk yet). Passwords hashed with bcrypt.

## Stack

Next.js 14 · NestJS 10 · Prisma 5 · PostgreSQL · Redis · Tailwind · next-intl · class-validator · JWT.

Hosting target: **Vercel** (web) + **Railway** (api, postgres, redis).

## Local dev (Windows / PowerShell)

```powershell
npm install
Copy-Item .env.example .env
# Edit .env with a hosted Postgres URL (Railway free tier works)
npm run db:generate
npm run db:migrate
npm run api:dev    # http://localhost:4000
npm run web:dev    # http://localhost:3000
```

Docker is **optional** — `docker-compose.yml` is provided as documentation but not required.

## Conventions

- TypeScript strict mode everywhere (`tsconfig.base.json`).
- API routes prefixed with `/api` except `/health`.
- DB decimals use `Decimal(14, 2)` for money. Never use `Float` for money.
- Activity log every state-changing action (`Order` status change, `Product` stock adjustment, etc.) — see `ActivityLog` model.

## Things to remember when extending

1. Every new entity that holds tenant data → add `storeId` + `@@index([storeId])` to the Prisma model.
2. Every new endpoint → require auth, derive `storeId` from `@CurrentTenant()`, filter all queries by it.
3. Every new user-facing string → add to both `ru.json` and `uz.json`.
4. New money amounts → `Decimal(14, 2)`, never `Float`.
