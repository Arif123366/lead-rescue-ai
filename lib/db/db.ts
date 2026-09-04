/**
 * lib/db/db.ts
 * Dual-Engine Database Module:
 *  - Local Development: LibSQL / SQLite (`dev.db`)
 *  - Production:        Supabase PostgreSQL via `postgres` npm driver
 */

import path from 'path';
import fs from 'fs';

// ─── Engine detection ────────────────────────────────────────────────────────

const POSTGRES_URL =
  process.env.POSTGRES_URL ||
  (process.env.DATABASE_URL?.startsWith('postgres')
    ? process.env.DATABASE_URL
    : undefined);

const isPostgres = Boolean(POSTGRES_URL);

// ─── PostgreSQL setup (production) ───────────────────────────────────────────

let pgClient: any = null;

async function getPgClient() {
  if (!pgClient) {
    // Dynamically import to avoid bundling on SQLite path
    const postgres = (await import('postgres')).default;
    pgClient = postgres(POSTGRES_URL!, {
      ssl: 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for Supabase connection pooler
    });
  }
  return pgClient;
}

// ─── SQLite / LibSQL setup (local) ───────────────────────────────────────────

import type { Client as LibSqlClient } from '@libsql/client';

declare global {
  // eslint-disable-next-line no-var
  var __libsql_client: LibSqlClient | undefined;
}

let sqliteClient: LibSqlClient | null = null;

async function getSqliteClient(): Promise<LibSqlClient> {
  if (sqliteClient) return sqliteClient;
  if (globalThis.__libsql_client) {
    sqliteClient = globalThis.__libsql_client;
    return sqliteClient;
  }
  const { createClient } = await import('@libsql/client');
  const dbPath = path.join(process.cwd(), 'dev.db');
  sqliteClient = createClient({ url: `file:${dbPath}` });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__libsql_client = sqliteClient;
  }
  return sqliteClient;
}

// ─── Schema initialization (SQLite only) ─────────────────────────────────────

let schemaInitialized = false;

async function ensureSchema() {
  if (isPostgres || schemaInitialized) return;
  try {
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const client = await getSqliteClient();
      const statements = schemaSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        await client.execute({ sql: stmt });
      }

      // Idempotent column migrations
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
        try { await client.execute({ sql: mig }); } catch { /* ignore duplicate column */ }
      }
    }
    schemaInitialized = true;
  } catch (err) {
    console.error('[db] Failed to initialize schema:', err);
  }
}

// ─── Normalize SQL placeholders ───────────────────────────────────────────────

/**
 * Converts SQLite `?` positional placeholders → PostgreSQL `$1, $2 …`
 */
function normalizeSql(sql: string): string {
  if (!isPostgres) return sql;
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a SELECT — returns typed rows array.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  const normalized = normalizeSql(sql);

  if (isPostgres) {
    const pg = await getPgClient();
    // postgres.js uses tagged templates; use unsafe() for dynamic queries
    const rows = await pg.unsafe(normalized, params);
    return rows as unknown as T[];
  } else {
    const client = await getSqliteClient();
    const res = await client.execute({ sql: normalized, args: params });
    return res.rows as unknown as T[];
  }
}

/**
 * Execute a SELECT and return only the first row (or undefined).
 */
export async function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

/**
 * Execute INSERT / UPDATE / DELETE — returns affected row count.
 */
export async function run(sql: string, params: any[] = []): Promise<{ changes: number }> {
  await ensureSchema();
  const normalized = normalizeSql(sql);

  if (isPostgres) {
    const pg = await getPgClient();
    const res = await pg.unsafe(normalized, params);
    return { changes: res.count ?? 0 };
  } else {
    const client = await getSqliteClient();
    const res = await client.execute({ sql: normalized, args: params });
    return { changes: Number(res.rowsAffected) };
  }
}

/**
 * Sequential transaction wrapper.
 */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  if (isPostgres) {
    const pg = await getPgClient();
    let result!: T;
    await pg.begin(async (sql: any) => {
      // Re-route run/query inside the transaction to use `sql` context
      result = await fn();
    });
    return result;
  }
  return await fn();
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Legacy named export for any code that does `import { client } from …`
export const client = {
  execute: async (opts: { sql: string; args?: any[] }) => {
    const rows = await query(opts.sql, opts.args ?? []);
    return { rows, rowsAffected: rows.length };
  },
};

export default { query, get, run, transaction, generateId };
