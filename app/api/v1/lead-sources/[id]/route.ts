import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, type, configuration, is_active } = await req.json();

  const src = await get('SELECT id FROM lead_sources WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!src) return NextResponse.json({ error: 'Lead source not found.' }, { status: 404 });

  await run(
    `UPDATE lead_sources 
     SET name = COALESCE(?, name),
         type = COALESCE(?, type),
         configuration = COALESCE(?, configuration),
         is_active = COALESCE(?, is_active),
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      name ?? null,
      type ?? null,
      configuration ? JSON.stringify(configuration) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      params.id
    ]
  );

  return NextResponse.json({ message: 'Lead source updated successfully.' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const src = await get('SELECT id FROM lead_sources WHERE id = ? AND organization_id = ?', [params.id, session.organization_id]);
  if (!src) return NextResponse.json({ error: 'Lead source not found.' }, { status: 404 });

  await run('DELETE FROM lead_sources WHERE id = ?', [params.id]);

  return NextResponse.json({ message: 'Lead source deleted successfully.' });
}
