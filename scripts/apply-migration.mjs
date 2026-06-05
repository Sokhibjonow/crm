// One-shot migration runner that uses Neon's HTTP endpoint (port 443) when
// the host's outbound 5432 is blocked. Applies the SQL from a single file
// and records it in the _prisma_migrations table so `prisma migrate deploy`
// stays in sync next time.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { createHash, randomUUID } from 'node:crypto';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL or DIRECT_URL must be set');

const migrationName = process.argv[2];
if (!migrationName) {
  throw new Error('Usage: node apply-migration.mjs <migration_folder_name>');
}

const sqlFile = resolve(
  'packages/db/prisma/migrations',
  migrationName,
  'migration.sql',
);
const sqlText = readFileSync(sqlFile, 'utf8');
const checksum = createHash('sha256').update(sqlText).digest('hex');

const sql = neon(url);

console.log(`Applying ${migrationName}...`);

// Strip line comments, then split on semicolons. Neon HTTP doesn't support
// multi-statement queries in a single call.
const stripped = sqlText
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

const statements = stripped
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

if (statements.length === 0) {
  throw new Error('No statements found in migration file.');
}

for (const stmt of statements) {
  console.log('  >', stmt.split('\n').join(' ').slice(0, 100));
  await sql.query(stmt);
}

// Record in _prisma_migrations so Prisma considers it applied.
const id = randomUUID();
const startedAt = new Date().toISOString();
await sql.query(
  `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   VALUES ($1, $2, NOW(), $3, NULL, NULL, $4, $5)
   ON CONFLICT DO NOTHING`,
  [id, checksum, migrationName, startedAt, statements.length],
);

console.log(`Done. Applied ${statements.length} statement(s).`);
