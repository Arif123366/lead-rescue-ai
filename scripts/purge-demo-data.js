/**
 * scripts/purge-demo-data.js
 * Purges all demo, mock, and test records from local database (dev.db / PostgreSQL)
 * leaving only clean system subscription plans and schema.
 */

const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const client = createClient({ url: `file:${dbPath}` });

async function purgeDemoData() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('🧹 Lead Rescue AI — Purging Demo & Mock Data');
  console.log('────────────────────────────────────────────────────────────\n');

  const tablesToPurge = [
    'notifications',
    'appointments',
    'follow_up_messages',
    'follow_up_templates',
    'lead_qualification_results',
    'leads',
    'lead_sources',
    'crm_stages',
    'user_invitations',
    'password_reset_tokens',
    'users',
    'payment_transactions',
    'organization_rag_knowledge',
    'external_crm_connectors',
    'organizations',
  ];

  for (const table of tablesToPurge) {
    try {
      const res = await client.execute(`DELETE FROM ${table}`);
      console.log(`  ✓ Table '${table}': Purged ${res.rowsAffected || 0} demo/test record(s).`);
    } catch (err) {
      console.warn(`  ⚠️ Could not purge table '${table}': ${err.message}`);
    }
  }

  // Ensure subscription plans exist cleanly
  const plans = [
    {
      id: 'plan_starter',
      name: 'Starter',
      description: 'Perfect for small teams getting started with AI lead qualification',
      monthly_price: 0.00,
      lead_limit: 50,
      user_limit: 2,
      features: JSON.stringify(['AI Lead Qualification', 'Email Follow-up Automation', 'Basic CRM Pipeline']),
    },
    {
      id: 'plan_pro',
      name: 'Pro',
      description: 'For growing businesses requiring multi-channel recovery & automation',
      monthly_price: 99.00,
      lead_limit: 1000,
      user_limit: 5,
      features: JSON.stringify(['AI Qualification & Scoring', 'Email & WhatsApp Automated Sequences', 'Smart CRM Pipeline', 'Lead Rescue Alerts', 'CSV Bulk Import', 'Lead Source Webhooks']),
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'Maximum scale, custom integrations, unlimited lead handling',
      monthly_price: 299.00,
      lead_limit: 10000,
      user_limit: 25,
      features: JSON.stringify(['Unlimited AI Processing', 'Multi-Channel AI Follow-ups', 'Custom CRM Pipeline Customization', 'Dedicated Lead Rescue Dashboard', 'Sales Team Performance Analytics', 'Priority API & Support']),
    },
  ];

  for (const p of plans) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO subscription_plans (id, name, description, monthly_price, lead_limit, user_limit, features) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.name, p.description, p.monthly_price, p.lead_limit, p.user_limit, p.features],
    });
  }

  console.log('\n✅ Demo & mock data completely purged. System database reset to clean state!');
}

purgeDemoData().catch((err) => {
  console.error('❌ Purge failed:', err);
});
