# @savdo/db

Prisma schema and generated client for SavdoCRM.

## Commands

```powershell
npm run generate       # generate Prisma client
npm run migrate:dev    # create + apply a migration in dev
npm run migrate:deploy # apply migrations in prod
npm run studio         # open Prisma Studio
```

## Multi-tenancy

Every tenant-scoped model carries `storeId`. **All queries against tenant data must filter by `storeId`.** The API layer enforces this via a tenant guard + Prisma extension (see `apps/api/src/common/tenant`).
