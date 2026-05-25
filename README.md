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

# 2. Provision a Postgres (Railway free tier works) and put DATABASE_URL
#    into .env. Set JWT_SECRET to a long random string.
Copy-Item .env.example .env

# 3. Generate Prisma client and create the initial migration
npm run db:generate
npm -w @savdo/db run migrate:dev -- --name init

# 4. Run dev servers (two terminals)
npm run api:dev    # http://localhost:4000  (health: GET /health)
npm run web:dev    # http://localhost:3000
```

### Telegram bot (optional)

Create a bot via [@BotFather](https://t.me/BotFather), put the token in
`TELEGRAM_BOT_TOKEN` and the bot's username in `TELEGRAM_BOT_USERNAME`
(without `@`). The API will start the bot in long-polling mode on boot.

When the bot is configured, every customer card gains a Telegram section
that generates a deep link `https://t.me/<bot>?start=c_<code>`. When the
customer follows it, the bot captures their chat ID and the link code is
consumed. After that, the customer receives DMs when the order is
created and on every status change (CONFIRMED / PACKING / SHIPPED /
DELIVERED / CANCELLED). Messages render in the store's locale.

### Try the auth flow

1. Open `http://localhost:3000` — you'll be redirected to `/ru`.
2. Click **Регистрация**, fill in store name + your name + email + password (≥8 chars).
3. On success you land on `/ru/dashboard`. The cookie `savdo_auth` holds your JWT (7-day expiry).
4. Logout via the button in the header. The middleware redirects authenticated users away from `/login` and `/register`, and unauthenticated users away from `/dashboard`.

## MVP scope (v1)

Auth · Dashboard · Customers · Orders · Products · Inventory · Basic reports · Roles.

Phase 2+ (not in MVP): Telegram bot, courier integrations, POS, full ERP, advanced analytics.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for the full walkthrough (GitHub → Railway for API + Postgres → Vercel for web).

## Roadmap

1. Shops (current)
2. Courier integrations
3. POS
4. Advanced analytics
5. Full ERP
