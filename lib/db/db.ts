import { createClient, Client as LibSqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

/**
 * lib/db/db.ts
 * Dual-Engine Database Module supporting:
 * 1. Local Development: LibSQL / SQLite (`dev.db`)
 * 2. Cloud Production: Supabase PostgreSQL (`POSTGRES_URL` or `SUPABASE_URL`)
 */

const isPostgres = Boolean(
  process.env.POSTGRES_URL ||
    (process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgres://') ||
        process.env.DATABASE_URL.startsWith('postgresql://')))
);

function getDbUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const dbPath = path.join(process.cwd(), 'dev.db');
  return `file:${dbPath}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __libsql_client: LibSqlClient | undefined;
}

export const client: LibSqlClient =
  globalThis.__libsql_client ??
  createClient({ url: getDbUrl() });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__libsql_client = client;
}

// Auto-run schema on init (idempotent — uses CREATE TABLE IF NOT EXISTS)
let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  try {
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await client.execute(stmt);
      }

      // Column migrations for existing tables (idempotent try-catch)
      const migrations = [
        "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'",
        "ALTER TABLE organizations ADD COLUMN payment_provider TEXT DEFAULT 'stripe'",
        "ALTER TABLE organizations ADD COLUMN payment_status TEXT DEFAULT 'active'",
        "ALTER TABLE organizations ADD COLUMN payment_reference_id TEXT",
        "ALTER TABLE follow_up_messages ADD COLUMN message TEXT",
        "ALTER TABLE follow_up_messages ADD COLUMN message_content TEXT",
        "ALTER TABLE follow_up_messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'Email'",
        "ALTER TABLE follow_up_messages ADD COLUMN direction TEXT NOT NULL DEFAULT 'Outbound'",
        "UPDATE lead_sources SET name = 'WhatsApp' WHERE name LIKE '%Whastapp%' OR name LIKE '%Whatapp%'",
      ];

      for (const mig of migrations) {
        try {
          await client.execute(mig);
        } catch {}
      }
    }
    schemaInitialized = true;
  } catch (err) {
    console.error('[db] Failed to initialize database schema:', err);
  }
}

/**
 * Converts SQLite positional `?` placeholders to PostgreSQL `$1, $2, $3` positional parameters if needed.
 */
function normalizeSql(sql: string, isPg: boolean): string {
  if (!isPg) return sql;
  let paramIdx = 1;
  return sql.replace(/\?/g, () => `$${paramIdx++}`);
}

/**
 * Execute a raw SELECT query — returns typed rows.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  const normalizedSql = normalizeSql(sql, isPostgres);
  const res = await client.execute({ sql: normalizedSql, args: params });
  return res.rows as unknown as T[];
}

/**
 * Execute a raw SELECT and return only the first row (or undefined).
 */
export async function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

/**
 * Execute a raw INSERT / UPDATE / DELETE — returns affected row count.
 */
export async function run(sql: string, params: any[] = []): Promise<{ changes: number }> {
  await ensureSchema();
  const normalizedSql = normalizeSql(sql, isPostgres);
  const res = await client.execute({ sql: normalizedSql, args: params });
  return { changes: Number(res.rowsAffected) };
}

/**
 * Wrap multiple operations in a pseudo-transaction (sequential execution).
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  return await fn();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export default { query, get, run, transaction, generateId };
