import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, message_body, channel, trigger_conditions, is_active } = await req.json();

  const tpl = await get('SELECT id FROM follow_up_templates WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!tpl) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

  await run(
    `UPDATE follow_up_templates 
     SET name = COALESCE(?, name),
         message_body = COALESCE(?, message_body),
         channel = COALESCE(?, channel),
         trigger_conditions = COALESCE(?, trigger_conditions),
         is_active = COALESCE(?, is_active),
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      name ?? null,
      message_body ?? null,
      channel ?? null,
      trigger_conditions ? JSON.stringify(trigger_conditions) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      params.id
    ]
  );

  return NextResponse.json({ message: 'Template updated successfully.' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tpl = await get('SELECT id FROM follow_up_templates WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!tpl) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

  await run('DELETE FROM follow_up_templates WHERE id = ?', [params.id]);

  return NextResponse.json({ message: 'Template deleted successfully.' });
}
