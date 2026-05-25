# SavdoCRM

Retail CRM SaaS for small/medium businesses in Uzbekistan — Instagram shops, Telegram shops, clothing/electronics/cosmetics sellers.

## Monorepo layout

```
apps/
  api/      NestJS REST API (auth, customers, orders, products, inventory, reports, team)
  web/      Next.js 14 App Router UI (ru / uz-Latn)
packages/
  db/       Prisma schema, migrations, generated client
```

## Stack

- Next.js 14 + Tailwind + shadcn/ui (web)
- NestJS + Prisma (api)
- PostgreSQL + Redis
- JWT auth, multi-tenant via `storeId`
- Hosting: Vercel (web) + Railway (api, postgres, redis)

## Quick start (Windows / PowerShell)

```powershell
# 1. Install
npm install

# 2. Provision a Postgres (use Railway free tier and copy DATABASE_URL into .env)
Copy-Item .env.example .env

# 3. Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# 4. Run dev servers (two terminals)
npm run api:dev
npm run web:dev
```

API: http://localhost:4000 — health: `GET /health`
Web: http://localhost:3000

## MVP scope (v1)

Auth · Dashboard · Customers · Orders · Products · Inventory · Basic reports · Roles.

Phase 2+ (not in MVP): Telegram bot, courier integrations, POS, full ERP, advanced analytics.

## Roadmap

1. Shops (current)
2. Courier integrations
3. POS
4. Advanced analytics
5. Full ERP
