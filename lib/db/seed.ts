import { client } from './db';
import fs from 'fs';
import path from 'path';

export async function seedDatabase() {
  console.log('[seed] Seeding database schema and subscription plans...');

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
  }

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
      features: JSON.stringify([
        'AI Qualification & Scoring',
        'Email & WhatsApp Automated Sequences',
        'Smart CRM Pipeline',
        'Lead Rescue Alerts',
        'CSV Bulk Import',
        'Lead Source Webhooks',
      ]),
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'Maximum scale, custom integrations, unlimited lead handling',
      monthly_price: 299.00,
      lead_limit: 10000,
      user_limit: 25,
      features: JSON.stringify([
        'Unlimited AI Processing',
        'Multi-Channel AI Follow-ups',
        'Custom CRM Pipeline Customization',
        'Dedicated Lead Rescue Dashboard',
        'Sales Team Performance Analytics',
        'Priority API & Support',
      ]),
    },
  ];

  for (const p of plans) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO subscription_plans (id, name, description, monthly_price, lead_limit, user_limit, features) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.name, p.description, p.monthly_price, p.lead_limit, p.user_limit, p.features],
    });
  }

  console.log('[seed] Clean seed complete.');
}
