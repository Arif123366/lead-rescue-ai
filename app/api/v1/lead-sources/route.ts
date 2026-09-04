import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query, run } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sources = await query<any>(
    'SELECT * FROM lead_sources WHERE organization_id = ? ORDER BY created_at DESC',
    [session.organization_id]
  );

  return NextResponse.json({
    sources: sources.map(s => {
      const parsedConfig = s.configuration ? JSON.parse(s.configuration) : {};
      return {
        ...s,
        configuration: {
          webhook_url: `/api/v1/webhooks/lead-source/${s.id}`,
          ...parsedConfig
        }
      };
    })
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, type, configuration } = await req.json();

  if (!name || !type) {
    return NextResponse.json({ error: 'name and type are required.' }, { status: 400 });
  }

  const sourceId = crypto.randomUUID();
  const webhookUrl = `/api/v1/webhooks/lead-source/${sourceId}`;

  const finalConfig = {
    webhook_url: webhookUrl,
    ...(configuration || {})
  };

  await run(
    `INSERT INTO lead_sources (id, organization_id, name, type, configuration, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      sourceId,
      session.organization_id,
      name,
      type,
      JSON.stringify(finalConfig)
    ]
  );

  return NextResponse.json({
    message: 'Lead source created successfully.',
    source_id: sourceId,
    webhook_url: webhookUrl
  }, { status: 201 });
}
