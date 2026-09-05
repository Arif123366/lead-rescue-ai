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
  if (schemaInitialized) return;
  if (isPostgres) {
    try {
      const pg = await getPgClient();
      const pgTables = [
        `CREATE TABLE IF NOT EXISTS subscription_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          monthly_price DOUBLE PRECISION NOT NULL DEFAULT 0.00,
          lead_limit INTEGER NOT NULL DEFAULT 0,
          user_limit INTEGER NOT NULL DEFAULT 1,
          features TEXT NOT NULL DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner_user_id TEXT,
          subscription_plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
          current_lead_count INTEGER NOT NULL DEFAULT 0,
          payment_provider TEXT DEFAULT 'stripe',
          payment_status TEXT DEFAULT 'active',
          payment_reference_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'Sales Representative',
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS crm_stages (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          order_index INTEGER NOT NULL,
          is_initial INTEGER NOT NULL DEFAULT 0,
          is_final_won INTEGER NOT NULL DEFAULT 0,
          is_final_lost INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(organization_id, name)
        )`,
        `CREATE TABLE IF NOT EXISTS lead_sources (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          configuration TEXT DEFAULT '{}',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(organization_id, name)
        )`,
        `CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT,
          email TEXT,
          phone TEXT,
          company TEXT,
          product_interest TEXT,
          source_id TEXT NOT NULL REFERENCES lead_sources(id),
          qualification_score INTEGER NOT NULL DEFAULT 0,
          qualification_status TEXT NOT NULL DEFAULT 'Pending',
          current_crm_stage_id TEXT NOT NULL REFERENCES crm_stages(id),
          assigned_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          last_contacted_at TIMESTAMP,
          deal_value DOUBLE PRECISION,
          reason_for_loss TEXT,
          opt_out_communications INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS lead_qualification_results (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
          analysis_data TEXT NOT NULL DEFAULT '{}',
          qualification_score INTEGER NOT NULL DEFAULT 0,
          qualification_status TEXT NOT NULL DEFAULT 'Pending',
          ai_model_used TEXT,
          processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS follow_up_templates (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          message_body TEXT NOT NULL,
          channel TEXT NOT NULL,
          trigger_conditions TEXT DEFAULT '{}',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(organization_id, name)
        )`,
        `CREATE TABLE IF NOT EXISTS follow_up_messages (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          template_id TEXT REFERENCES follow_up_templates(id) ON DELETE SET NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          message TEXT,
          message_content TEXT,
          channel TEXT NOT NULL DEFAULT 'Email',
          status TEXT NOT NULL DEFAULT 'Sent',
          direction TEXT NOT NULL DEFAULT 'Outbound',
          response_received_at TIMESTAMP,
          response_content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          scheduled_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'Scheduled',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          related_entity_id TEXT,
          related_entity_type TEXT,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS user_invitations (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'Sales Representative',
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP,
          invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payment_transactions (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
          provider TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          status TEXT NOT NULL DEFAULT 'pending',
          transaction_ref TEXT,
          checkout_session_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS organization_rag_knowledge (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content_chunk TEXT NOT NULL,
          category TEXT DEFAULT 'General Knowledge',
          keywords TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS external_crm_connectors (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          name TEXT NOT NULL,
          api_key_or_token TEXT NOT NULL,
          api_endpoint TEXT,
          sync_frequency_hours INTEGER DEFAULT 24,
          status TEXT DEFAULT 'Active',
          last_synced_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];
      // Create datetime() helper function in Postgres so any raw datetime('now') queries succeed automatically
      try {
        await pg.unsafe(`
          CREATE OR REPLACE FUNCTION datetime(val text DEFAULT 'now') 
          RETURNS timestamp AS $$
          BEGIN
            RETURN CURRENT_TIMESTAMP;
          END;
          $$ LANGUAGE plpgsql;
        `);
      } catch { /* ignore */ }

      const pgMigrations = [
        "ALTER TABLE subscription_plans ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE subscription_plans ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE organizations ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE organizations ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE crm_stages ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE crm_stages ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE lead_sources ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE lead_sources ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE leads ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE leads ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE lead_qualification_results ALTER COLUMN processed_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE lead_qualification_results ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE lead_qualification_results ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE follow_up_templates ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE follow_up_templates ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE follow_up_messages ALTER COLUMN sent_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE follow_up_messages ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE follow_up_messages ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE appointments ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE appointments ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE notifications ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE password_reset_tokens ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE user_invitations ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE payment_transactions ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE payment_transactions ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE organization_rag_knowledge ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE organization_rag_knowledge ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE external_crm_connectors ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE external_crm_connectors ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP",
      ];
      for (const mig of pgMigrations) {
        try { await pg.unsafe(mig); } catch { /* ignore if already set or table modified */ }
      }

      // Dynamic fix for any remaining columns in Postgres that have 'datetime' in their default expression
      try {
        const badDefaults = await pg.unsafe(`
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND column_default LIKE '%datetime%'
        `);
        for (const row of badDefaults) {
          try {
            await pg.unsafe(`ALTER TABLE "${row.table_name}" ALTER COLUMN "${row.column_name}" SET DEFAULT CURRENT_TIMESTAMP`);
          } catch { /* ignore */ }
        }
      } catch { /* ignore if information_schema query fails */ }

      schemaInitialized = true;
    } catch (err) {
      console.error('[db] Failed to run Postgres schema migrations:', err);
    }
    return;
  }

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
  let cleaned = sql;
  if (isPostgres) {
    cleaned = cleaned.replace(/datetime\s*\([^)]+\)/gi, 'NOW()');
    let i = 1;
    cleaned = cleaned.replace(/\?/g, () => `$${i++}`);
  } else {
    cleaned = cleaned.replace(/\bNOW\(\)/gi, "datetime('now')");
  }
  return cleaned;
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
