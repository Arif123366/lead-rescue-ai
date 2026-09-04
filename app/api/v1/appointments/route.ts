import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const leadId = url.searchParams.get('lead_id');
  const status = url.searchParams.get('status');

  let sql = `
    SELECT a.*, 
           l.name as lead_name, 
           l.email as lead_email, 
           l.phone as lead_phone, 
           l.company as lead_company,
           u.name as scheduled_by_name
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    JOIN users u ON a.scheduled_by_user_id = u.id
    WHERE l.organization_id = ?
  `;
  const params: any[] = [session.organization_id];

  if (leadId) {
    sql += ` AND a.lead_id = ?`;
    params.push(leadId);
  }

  if (status) {
    sql += ` AND a.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY a.start_time ASC`;

  const appointments = await query<any>(sql, params);
  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, start_time, end_time, notes } = await req.json();

  if (!lead_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'lead_id, start_time, and end_time are required.' }, { status: 400 });
  }

  const lead = await get('SELECT id, current_crm_stage_id FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const apptId = cryptoNativeOrRandomUUID();

  await run(
    `INSERT INTO appointments (id, lead_id, scheduled_by_user_id, start_time, end_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
    [apptId, lead_id, session.id, start_time, end_time, notes || null]
  );

  // Auto-move lead to Appointment Booked stage if available
  const apptStage = await get<{ id: string }>('SELECT id FROM crm_stages WHERE organization_id = ? AND (name LIKE \'%Appointment%\' OR name LIKE \'%Meeting%\') LIMIT 1', [session.organization_id]);
  if (apptStage) {
    await run("UPDATE leads SET current_crm_stage_id = ?, last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [apptStage.id, lead_id]);
  }

  return NextResponse.json({
    message: 'Appointment scheduled successfully.',
    appointment_id: apptId
  }, { status: 201 });
}
