import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await query<any>(
    'SELECT * FROM follow_up_templates WHERE organization_id = ? ORDER BY created_at DESC',
    [session.organization_id]
  );

  return NextResponse.json({
    templates: templates.map(t => ({
      ...t,
      trigger_conditions: t.trigger_conditions ? JSON.parse(t.trigger_conditions) : {}
    }))
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, message_body, channel, trigger_conditions } = await req.json();

  if (!name || !message_body) {
    return NextResponse.json({ error: 'name and message_body are required.' }, { status: 400 });
  }

  const templateId = cryptoNativeOrRandomUUID();

  await run(
    `INSERT INTO follow_up_templates (id, organization_id, name, message_body, channel, trigger_conditions, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      templateId,
      session.organization_id,
      name,
      message_body,
      channel || 'Email',
      JSON.stringify(trigger_conditions || {})
    ]
  );

  return NextResponse.json({
    message: 'Follow-up template created successfully.',
    template_id: templateId
  }, { status: 201 });
}
