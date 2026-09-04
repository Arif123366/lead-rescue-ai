CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price REAL NOT NULL DEFAULT 0.00,
  lead_limit INTEGER NOT NULL DEFAULT 0,
  user_limit INTEGER NOT NULL DEFAULT 1,
  features TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT,
  subscription_plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  current_lead_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Sales Representative',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_stages (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_initial INTEGER NOT NULL DEFAULT 0,
  is_final_won INTEGER NOT NULL DEFAULT 0,
  is_final_lost INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS lead_sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  configuration TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS leads (
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
  last_contacted_at TEXT,
  deal_value REAL,
  reason_for_loss TEXT,
  opt_out_communications INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lead_qualification_results (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  analysis_data TEXT NOT NULL DEFAULT '{}',
  qualification_score INTEGER NOT NULL DEFAULT 0,
  qualification_status TEXT NOT NULL DEFAULT 'Pending',
  ai_model_used TEXT,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follow_up_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  channel TEXT NOT NULL,
  trigger_conditions TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS follow_up_messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES follow_up_templates(id) ON DELETE SET NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Sent',
  direction TEXT NOT NULL DEFAULT 'Outbound',
  response_received_at TEXT,
  response_content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_id TEXT,
  related_entity_type TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Password reset tokens (secure one-time-use tokens)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User invitation tokens (for team member invite flow)
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Sales Representative',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(current_crm_stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted ON leads(last_contacted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);

-- Payment transactions table (Stripe & Payoneer)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  provider TEXT NOT NULL, -- 'stripe' | 'payoneer'
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  transaction_ref TEXT,
  checkout_session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_org ON payment_transactions(organization_id);

-- RAG Company Knowledge Base table
CREATE TABLE IF NOT EXISTS organization_rag_knowledge (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_chunk TEXT NOT NULL,
  category TEXT DEFAULT 'General Knowledge',
  keywords TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rag_knowledge_org ON organization_rag_knowledge(organization_id);

-- External CRM Connectors (HubSpot, Salesforce, Zoho, Pipedrive, GoHighLevel)
CREATE TABLE IF NOT EXISTS external_crm_connectors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'HubSpot' | 'Salesforce' | 'Zoho' | 'Pipedrive' | 'GoHighLevel'
  name TEXT NOT NULL,
  api_key_or_token TEXT NOT NULL,
  api_endpoint TEXT,
  sync_frequency_hours INTEGER DEFAULT 24,
  status TEXT DEFAULT 'Active', -- 'Active' | 'Paused' | 'Error'
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crm_connectors_org ON external_crm_connectors(organization_id);


