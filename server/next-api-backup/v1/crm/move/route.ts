import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, target_stage_id, deal_value, reason_for_loss } = await req.json();

  if (!lead_id || !target_stage_id) {
    return NextResponse.json({ error: 'lead_id and target_stage_id are required.' }, { status: 400 });
  }

  const lead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const stage = await get<any>('SELECT * FROM crm_stages WHERE id = ? AND organization_id = ?', [target_stage_id, session.organization_id]);
  if (!stage) return NextResponse.json({ error: 'CRM stage not found.' }, { status: 404 });

  await run(
    `UPDATE leads 
     SET current_crm_stage_id = ?, 
         deal_value = COALESCE(?, deal_value), 
         reason_for_loss = COALESCE(?, reason_for_loss),
         updated_at = datetime('now')
     WHERE id = ?`,
    [target_stage_id, deal_value ?? null, reason_for_loss ?? null, lead_id]
  );

  return NextResponse.json({
    message: 'Lead stage moved successfully.',
    lead_id,
    new_stage: stage.name
  });
}
