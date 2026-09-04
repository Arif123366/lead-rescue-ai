import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const stageId = url.searchParams.get('stage_id') || '';
  const assignedUserId = url.searchParams.get('assigned_user_id') || '';
  const sourceId = url.searchParams.get('source_id') || '';

  let sql = `
    SELECT l.*, 
           ls.name as source_name, 
           cs.name as stage_name, 
           u.name as assigned_user_name,
           lqr.analysis_data
    FROM leads l
    LEFT JOIN lead_sources ls ON l.source_id = ls.id
    LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
    LEFT JOIN users u ON l.assigned_to_user_id = u.id
    LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
    WHERE l.organization_id = ?
  `;
  const params: any[] = [session.organization_id];

  if (search) {
    sql += ` AND (l.name LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (status) {
    sql += ` AND l.qualification_status = ?`;
    params.push(status);
  }

  if (stageId) {
    sql += ` AND l.current_crm_stage_id = ?`;
    params.push(stageId);
  }

  if (assignedUserId) {
    sql += ` AND l.assigned_to_user_id = ?`;
    params.push(assignedUserId);
  }

  if (sourceId) {
    sql += ` AND l.source_id = ?`;
    params.push(sourceId);
  }

  sql += ` ORDER BY l.created_at DESC`;

  const leads = await query<any>(sql, params);

  return NextResponse.json({
    leads: leads.map(l => ({
      ...l,
      analysis_data: l.analysis_data ? JSON.parse(l.analysis_data) : null
    }))
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, company, product_interest, source_id, assigned_to_user_id, deal_value } = body;

  const orgInfo = await get<any>(
    `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
     FROM organizations o
     JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
     WHERE o.id = ?`,
    [session.organization_id]
  );

  if (orgInfo && orgInfo.actual_leads >= orgInfo.lead_limit) {
    return NextResponse.json(
      { error: `Organization lead limit of ${orgInfo.lead_limit} reached. Please upgrade your subscription plan to add more leads.` },
      { status: 400 }
    );
  }

  let finalSourceId = source_id;
  if (!finalSourceId) {
    const manualSource = await get<any>('SELECT id FROM lead_sources WHERE organization_id = ? AND type = \'Manual\' LIMIT 1', [session.organization_id])
      || await get<any>('SELECT id FROM lead_sources WHERE organization_id = ? LIMIT 1', [session.organization_id]);
    finalSourceId = manualSource?.id;
  }

  if (!finalSourceId) {
    finalSourceId = cryptoNativeOrRandomUUID();
    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration) VALUES (?, ?, 'Manual Entry', 'Manual', '{}')`,
      [finalSourceId, session.organization_id]
    );
  }

  const initialStage = await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [session.organization_id])
    || await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [session.organization_id]);

  if (!initialStage) {
    return NextResponse.json({ error: 'No CRM stage found for organization.' }, { status: 500 });
  }

  const leadId = cryptoNativeOrRandomUUID();

  await run(
    `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, assigned_to_user_id, deal_value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      leadId,
      session.organization_id,
      name || 'Unnamed Lead',
      email || null,
      phone || null,
      company || null,
      product_interest || null,
      finalSourceId,
      initialStage.id,
      assigned_to_user_id || null,
      deal_value || null
    ]
  );

  await run('UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?', [session.organization_id]);

  const sourceObj = await get<{ name: string }>('SELECT name FROM lead_sources WHERE id = ?', [finalSourceId]);
  
  qualifyLead({
    leadId,
    name,
    email,
    phone,
    company,
    product_interest,
    source_name: sourceObj?.name || 'Manual Entry'
  }).catch(err => console.error('Error during AI qualification:', err));

  return NextResponse.json({
    message: 'Lead created successfully and AI qualification initiated.',
    lead_id: leadId
  }, { status: 201 });
}
