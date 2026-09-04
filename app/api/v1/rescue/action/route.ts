import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';
import { sendFollowUp } from '@/lib/ai/followup';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, action_type, custom_message, template_id } = await req.json();

  if (!lead_id || !action_type) {
    return NextResponse.json({ error: 'lead_id and action_type are required.' }, { status: 400 });
  }

  const lead = await get<any>('SELECT * FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  let resultMessage = '';

  if (action_type === 'send_followup') {
    const res = await sendFollowUp({
      leadId: lead_id,
      templateId: template_id,
      customMessage: custom_message || `Hi ${lead.name}, I wanted to re-connect regarding your interest in ${lead.product_interest || 'our solutions'}. Do you have 5 minutes for a quick update call?`
    });
    resultMessage = `Follow-up sent via ${res.channel}.`;
  } else if (action_type === 'reassign') {
    const { new_user_id } = await req.json().catch(() => ({ new_user_id: null }));
    const targetUserId = new_user_id || session.id;
    await run("UPDATE leads SET assigned_to_user_id = ?, updated_at = datetime('now') WHERE id = ?", [targetUserId, lead_id]);
    resultMessage = 'Lead reassigned successfully.';
  } else if (action_type === 'mark_contacted') {
    await run("UPDATE leads SET last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [lead_id]);
    resultMessage = 'Lead last contacted timestamp updated.';
  }

  // Clear pending rescue alert notifications for this lead
  await run("UPDATE notifications SET is_read = 1 WHERE related_entity_id = ? AND type = 'LEAD_RESCUE_ALERT'", [lead_id]);

  return NextResponse.json({
    message: 'Lead rescue action executed successfully.',
    result_summary: resultMessage
  });
}
