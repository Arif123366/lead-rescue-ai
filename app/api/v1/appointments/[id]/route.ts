import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, notes, start_time, end_time } = await req.json();

  const appt = await get<any>(
    `SELECT a.* FROM appointments a JOIN leads l ON a.lead_id = l.id WHERE a.id = ? AND l.organization_id = ?`,
    [params.id, session.organization_id]
  );

  if (!appt) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });

  await run(
    `UPDATE appointments SET status = ?, notes = ?, start_time = ?, end_time = ?, updated_at = datetime('now') WHERE id = ?`,
    [status || appt.status, notes ?? appt.notes, start_time || appt.start_time, end_time || appt.end_time, params.id]
  );

  return NextResponse.json({ message: 'Appointment updated successfully.' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const appt = await get<any>(
    `SELECT a.* FROM appointments a JOIN leads l ON a.lead_id = l.id WHERE a.id = ? AND l.organization_id = ?`,
    [params.id, session.organization_id]
  );

  if (!appt) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });

  await run('DELETE FROM appointments WHERE id = ?', [params.id]);

  return NextResponse.json({ message: 'Appointment deleted successfully.' });
}
