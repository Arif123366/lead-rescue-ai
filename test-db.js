const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const client = createClient({
  url: `file:${dbPath}`
});

async function main() {
  console.log('Testing LibSQL database...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'lib', 'db', 'schema.sql'), 'utf8');
  
  // Split schema SQL statements
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  console.log('Schema created successfully!');
  const res = await client.execute('SELECT count(*) as count FROM subscription_plans');
  console.log('Plans count:', res.rows);
}

main().catch(err => {
  console.error('Database test error:', err);
  process.exit(1);
});
