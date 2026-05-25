# Deploy SavdoCRM

Production hosting target:

- **`apps/web`** (Next.js 14) → **Vercel**
- **`apps/api`** (NestJS + Telegram long-polling bot) → **Railway**
- **PostgreSQL** → Railway (provisioned as part of the API project)

Vercel cannot host the API: the Telegram bot uses long-polling and the
NestJS process is stateful, so it needs a long-running container — not
serverless functions.

---

## 0. Prerequisites

- A GitHub account
- A Vercel account (free) — sign in with GitHub
- A Railway account (free trial) — sign in with GitHub
- The Telegram bot token (already in your local `.env`)

---

## 1. Create the GitHub repo and push

Go to <https://github.com/new>, create a repo (e.g. `savdocrm`),
**leave it empty** (no README/license/.gitignore — the repo already
has them).

Then in PowerShell from the project root:

```powershell
git remote add origin https://github.com/<your-user>/savdocrm.git
git branch -M main
git push -u origin main
```

> If git asks for credentials, use a [Personal Access Token](https://github.com/settings/tokens) (classic, `repo` scope) as the password.

---

## 2. Railway: API + Postgres

### 2.1 Create the project

1. Go to <https://railway.com/new> → **Deploy from GitHub repo** → pick `savdocrm`.
2. Railway will start trying to build immediately. **Don't worry if the first build fails** — we need to add env vars + Postgres first.

### 2.2 Add Postgres

In the Railway project: **+ New** → **Database** → **PostgreSQL**.

Open the new Postgres service → **Variables** tab → copy the value of
`DATABASE_URL` (the public one that starts with `postgresql://`).

### 2.3 Configure the API service

Click the API service (the one that was deployed from your repo) →
**Settings** tab:

- **Build Command:** `npm run build:railway`
- **Start Command:** `npm run start:railway`
- **Root Directory:** leave empty (it's the repo root — the workspace install needs the root `package.json`)

Then **Variables** tab — add these (Railway has a "Raw Editor" you can
paste into):

```env
DATABASE_URL=<paste the value from step 2.2>
JWT_SECRET=<paste from your local .env, or generate a new strong one>
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=<your bot token from @BotFather>
TELEGRAM_BOT_USERNAME=<your bot username, no @>
WEB_ORIGIN=https://<your-vercel-domain>.vercel.app
NODE_ENV=production
```

> Never commit real secrets to a public repo. Keep the actual values
> only in `.env` (gitignored) and in the Railway/Vercel dashboards.

(`WEB_ORIGIN` you'll come back and fill in after step 3 — Vercel gives
you the URL.)

### 2.4 Generate the initial migration locally, then deploy

The Railway deploy will run `prisma migrate deploy`, which only applies
migrations that already exist in the repo. You need to create the first
migration locally against the Railway database.

In your local `.env`, **replace the placeholder `DATABASE_URL` with the
one from step 2.2**. Then:

```powershell
npm -w @savdo/db run migrate:dev -- --name init
```

This creates `packages/db/prisma/migrations/<timestamp>_init/` and
applies it to the Railway database. Commit and push:

```powershell
git add packages/db/prisma/migrations
git commit -m "chore(db): initial migration"
git push
```

Railway will redeploy. Watch the **Deployments** tab — the start log
should show `Telegram bot @SavdoCRMbot started` and `API listening on
:<port>`.

### 2.5 Expose the API publicly

In the API service → **Settings** → **Networking** → **Generate Domain**.

Railway gives you a URL like `https://savdocrm-api-production-xxx.up.railway.app`.
Visit `<that URL>/health` — you should see `{ "status": "ok", "db": "up" }`.

Keep this URL — Vercel needs it next.

---

## 3. Vercel: the web app

### 3.1 Import the repo

Go to <https://vercel.com/new> → **Import Git Repository** → pick
`savdocrm`.

On the configuration screen:

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** click **Edit** and set to `apps/web`
- **Build Command / Install Command / Output Directory:** leave defaults — Vercel auto-detects them and handles npm workspaces correctly when Root Directory points to a workspace package.

### 3.2 Environment variables

Expand **Environment Variables** and add:

```env
NEXT_PUBLIC_API_URL=https://<your-railway-api-domain>
```

(from step 2.5 — no trailing slash)

Click **Deploy**.

### 3.3 Wire CORS back to Vercel

After the first Vercel deploy succeeds, copy the production URL (e.g.
`https://savdocrm.vercel.app`).

Back in Railway → API service → **Variables**, set:

```
WEB_ORIGIN=https://savdocrm.vercel.app
```

Railway will redeploy the API with the locked-down CORS origin.

If you later add a custom domain to Vercel, add it as a second value
comma-separated, e.g.
`WEB_ORIGIN=https://savdocrm.vercel.app,https://app.savdocrm.uz`.

---

## 4. Smoke test

1. Open `https://savdocrm.vercel.app` → should redirect to `/ru`
2. Register a store, log in
3. Create a customer → open the customer card → **Telegram** section → **Создать ссылку**
4. Open the link on your phone in Telegram → bot replies with greeting in the store's locale
5. Create an order for that customer → customer receives a Telegram DM
6. Change order status to CONFIRMED / SHIPPED / DELIVERED → another DM each time
7. Visit `/ru/reports` — daily revenue chart should have a bar for today
8. Visit `/ru/dashboard` — KPIs reflect real numbers

---

## Things that are easy to forget

- **One bot replica only.** Telegram long-polling fails if two
  processes poll the same token. Railway defaults to 1 replica — don't
  scale up the API service unless you also switch the bot to webhook
  mode.
- **`WEB_ORIGIN` matters.** If it's wrong, the browser blocks API
  calls with CORS errors and the dashboard stays empty.
- **Migrations must be in the repo.** `migrate:deploy` only applies
  what's already committed. New schema change → run `migrate:dev
  --name <whatever>` locally → commit → push → Railway applies it on
  next deploy.
- **Secrets hygiene.** Never put real tokens or `JWT_SECRET` values
  into committed files. They live in `.env` (gitignored) and in the
  Railway/Vercel dashboards only. If a token ever leaks, revoke it
  via @BotFather and update `.env` + Railway.

---

## Continuous deploy

Once everything is wired:

- Pushing to `main` → Vercel rebuilds web + Railway rebuilds API.
- Schema changes need a `migrate:dev` run locally first, then push.
- No CI is set up; verification is manual until you add one (GitHub
  Actions running `npm run typecheck` + Prisma format check is a good
  first step).
