import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lead = await get<any>(
    `SELECT l.*, 
            ls.name as source_name, 
            cs.name as stage_name, 
            u.name as assigned_user_name,
            lqr.analysis_data,
            lqr.ai_model_used,
            lqr.processed_at as qualified_at
     FROM leads l
     LEFT JOIN lead_sources ls ON l.source_id = ls.id
     LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
     LEFT JOIN users u ON l.assigned_to_user_id = u.id
     LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
     WHERE l.id = ? AND l.organization_id = ?`,
    [params.id, session.organization_id]
  );

  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const followUpHistory = await query<any>(
    'SELECT * FROM follow_up_messages WHERE lead_id = ? ORDER BY sent_at DESC',
    [params.id]
  );

  const appointments = await query<any>(
    `SELECT a.*, u.name as scheduled_by_name FROM appointments a JOIN users u ON a.scheduled_by_user_id = u.id WHERE a.lead_id = ? ORDER BY a.start_time DESC`,
    [params.id]
  );

  return NextResponse.json({
    lead: {
      ...lead,
      analysis_data: lead.analysis_data ? JSON.parse(lead.analysis_data) : null
    },
    follow_up_history: followUpHistory,
    appointments
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const existingLead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!existingLead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  await run(
    `UPDATE leads
     SET name = COALESCE(?, name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         company = COALESCE(?, company),
         product_interest = COALESCE(?, product_interest),
         assigned_to_user_id = COALESCE(?, assigned_to_user_id),
         deal_value = COALESCE(?, deal_value),
         notes = COALESCE(?, notes),
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      body.name ?? null,
      body.email ?? null,
      body.phone ?? null,
      body.company ?? null,
      body.product_interest ?? null,
      body.assigned_to_user_id ?? null,
      body.deal_value ?? null,
      body.notes ?? null,
      params.id
    ]
  );

  return NextResponse.json({ message: 'Lead updated successfully.' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existingLead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!existingLead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  await run('DELETE FROM leads WHERE id = ?', [params.id]);

  return NextResponse.json({ message: 'Lead deleted successfully.' });
}
