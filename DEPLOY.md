# Deploy SavdoCRM (Vercel-only)

Architecture:

- **`apps/web`** (Next.js 14) → Vercel project `crm-web`
- **`apps/api`** (NestJS) → Vercel project `crm-api` (serverless functions wrapping the Nest app)
- **PostgreSQL** → **Neon** (serverless Postgres, free tier, no card)
- **Telegram bot** → disabled on Vercel. Long-polling needs a continuously running process, which Vercel functions cannot provide. Re-enable in webhook mode later if needed.

Tradeoffs vs a long-running host (Railway/Fly):

- **Cold starts:** the first request after idle takes 1–3 seconds while Nest + Prisma boot. Warm requests are normal.
- **Bot is off:** order-status DMs to customers won't fire on Vercel. Everything else (auth, customers, orders, payments, reports, dashboard) works.
- **Two Vercel projects.** One repo, two Vercel projects, both auto-deployed from `main` on every push.

---

## 0. Prerequisites

- GitHub account (the repo `Sokhibjonow/crm` already exists)
- Vercel account (free) — sign in with GitHub
- Neon account (free) — sign in with GitHub

---

## 1. Provision Postgres on Neon

1. Go to <https://neon.tech> → sign in with GitHub → **Create a project**
2. Project name: `savdocrm`. Region: pick the one closest to your users (e.g. **Frankfurt** for Uzbekistan / CIS).
3. Once created, Neon shows you two connection strings under **Connection Details**:
   - **Pooled connection** (usually labeled "Pooled" or includes `-pooler` in the host). Copy this — it goes into `DATABASE_URL`.
   - **Direct connection** (no pooler). Copy this — it goes into `DIRECT_URL`.
4. Keep both handy. You'll paste them into Vercel and into your local `.env`.

---

## 2. Run the initial migration locally (against Neon)

Vercel builds don't run `prisma migrate deploy` for you (and even if they did, it's fragile during cold starts). Generate the migration files locally, commit them, then every deploy just applies what's already in the repo.

In your local `.env`, replace the `DATABASE_URL` placeholder with the **direct** (unpooled) Neon URL — `prisma migrate dev` needs a direct connection.

```powershell
# .env (local)
DATABASE_URL="postgresql://...neon.tech/.../neondb?sslmode=require"
DIRECT_URL="postgresql://...neon.tech/.../neondb?sslmode=require"
```

(For local dev you can use the same direct URL for both. In Vercel you'll use pooled for `DATABASE_URL`.)

Then:

```powershell
npm -w @savdo/db run migrate:dev -- --name init
```

This creates `packages/db/prisma/migrations/<timestamp>_init/` and applies it to Neon. Commit and push:

```powershell
git add packages/db/prisma/migrations
git commit -m "chore(db): initial migration"
git push
```

---

## 3. Vercel: API project

1. <https://vercel.com/new> → **Import Git Repository** → pick `Sokhibjonow/crm` (yes, the same repo as the web project — Vercel allows the same repo to back multiple projects).
2. **Project Name:** `crm-api`
3. **Framework Preset:** Other (Vercel will read `vercel.json` from the root directory)
4. **Root Directory:** click **Edit** → set to `apps/api` → Continue
5. **Build/Install/Output Commands** — leave default. Our `apps/api/vercel.json` already sets `buildCommand` to run `prisma generate`.
6. **Environment Variables** — add these before clicking Deploy:

```env
DATABASE_URL=<Neon pooled connection string>
DIRECT_URL=<Neon direct connection string>
JWT_SECRET=<paste from your local .env>
JWT_EXPIRES_IN=7d
NODE_ENV=production
# WEB_ORIGIN you'll come back and fill in after the web project URL is known.
```

Click **Deploy**. First build takes a few minutes (Vercel installs the whole monorepo and runs `prisma generate`).

7. After build succeeds, copy the production URL (e.g. `https://crm-api.vercel.app`). Visit `<that URL>/health` — should return `{ "status": "ok", "db": "up" }`. If DB shows `down`, double-check `DATABASE_URL`.

---

## 4. Vercel: web project

(If you already created `crm-web` earlier, skip to step 4.3 — just add the env var.)

### 4.1 Import

1. <https://vercel.com/new> → **Import Git Repository** → `Sokhibjonow/crm`
2. **Project Name:** `crm-web`
3. **Framework Preset:** Next.js (auto-detected)
4. **Root Directory:** click **Edit** → `apps/web` → Continue

### 4.2 Environment variable

Add **before** clicking Deploy (or in **Settings → Environment Variables** if the project already exists):

```env
NEXT_PUBLIC_API_URL=https://crm-api.vercel.app
```

(no trailing slash, no `/api` suffix — that prefix is added inside the fetch client)

### 4.3 Deploy

Vercel rebuilds and the web app now talks to the live API.

---

## 5. Lock CORS to the web origin

Back in the **`crm-api`** project → **Settings → Environment Variables**, set:

```env
WEB_ORIGIN=https://crm-web.vercel.app
```

Click **Save**, then **Deployments → ⋯ → Redeploy** the latest deployment to pick up the new env. If you later add a custom domain, comma-separate:
`WEB_ORIGIN=https://crm-web.vercel.app,https://app.savdocrm.uz`.

---

## 6. Smoke test

1. Open `https://crm-web.vercel.app` → redirects to `/ru`
2. Register a store → land on `/ru/dashboard`
3. Create a customer, a product, an order, add a payment
4. `/ru/reports` shows revenue, `/ru/dashboard` shows live KPIs
5. `/ru/settings/store` lets you change name/locale (OWNER)
6. `/ru/settings/profile` lets you edit name/phone and change password

---

## Things that are easy to forget

- **Schema changes need a migration step.** Edit `packages/db/prisma/schema.prisma` → run `npm -w @savdo/db run migrate:dev -- --name <whatever>` locally (against the Neon direct URL) → commit the migration files → push. Vercel doesn't run migrations.
- **Cold starts are real.** The first request after a few minutes of idle takes 1–3 seconds. Subsequent requests are fast. If this matters, switch the API to a long-running host later (Railway / Fly / a VPS).
- **The Telegram bot is intentionally off on Vercel.** `process.env.VERCEL` is detected in `TelegramService.onModuleInit` and polling is skipped. To turn it back on, refactor to webhook mode (Telegram POSTs to `/api/telegram/webhook/<secret>`) — that fits Vercel's model.
- **Two projects, one repo.** Pushing to `main` triggers builds in both `crm-web` and `crm-api` automatically. Each project's deploy status is independent.
- **Secrets hygiene.** Never commit real tokens or `JWT_SECRET` values. They live in `.env` (gitignored) and in each Vercel project's Environment Variables only.

---

## Continuous deploy

Once everything is wired:

- Pushing to `main` → both `crm-web` and `crm-api` rebuild and redeploy.
- Schema changes need a `migrate:dev` run locally first, then push.
- No CI is set up; verification is manual. A first CI step worth adding: GitHub Actions running `npm run typecheck` on PR.
