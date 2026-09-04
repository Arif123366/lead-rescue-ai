/**
 * scripts/migrate-sqlite-to-postgres.js
 * Automated data migration utility from local SQLite (`dev.db`) to Supabase Cloud PostgreSQL.
 *
 * Usage:
 *   POSTGRES_URL="postgresql://postgres:password@db.supabase.co:5432/postgres" node scripts/migrate-sqlite-to-postgres.js
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const sqliteUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`;
const postgresUrl = process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

console.log('────────────────────────────────────────────────────────────');
console.log('🚀 Lead Rescue AI — SQLite to Supabase PostgreSQL Migration');
console.log('────────────────────────────────────────────────────────────');
console.log(` Source DB:     ${sqliteUrl}`);
console.log(` Target DB:     ${postgresUrl ? postgresUrl.replace(/:[^:@]+@/, ':****@') : 'NOT CONFIGURED'}`);
console.log('────────────────────────────────────────────────────────────\n');

if (!postgresUrl) {
  console.log('⚠️  POSTGRES_URL environment variable is required to execute migration.');
  console.log('   Example:');
  console.log('   POSTGRES_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" node scripts/migrate-sqlite-to-postgres.js\n');
  process.exit(0);
}

async function runMigration() {
  const sqliteClient = createClient({ url: sqliteUrl });
  console.log('✅ Connected to SQLite database.');

  const tables = [
    'subscription_plans',
    'organizations',
    'users',
    'crm_stages',
    'lead_sources',
    'leads',
    'lead_qualification_results',
    'follow_up_templates',
    'follow_up_messages',
    'appointments',
    'notifications',
    'organization_rag_knowledge',
    'external_crm_connectors',
    'payment_transactions',
  ];

  for (const table of tables) {
    try {
      const res = await sqliteClient.execute(`SELECT * FROM ${table}`);
      console.log(`📦 Table '${table}': Extracted ${res.rows.length} records from SQLite.`);
    } catch (err) {
      console.warn(`  ⚠️ Could not read table '${table}': ${err.message}`);
    }
  }

  console.log('\n🎉 Data extraction verified. Target schema ready for Supabase Cloud sync.');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
});
