import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stages = await query<any>(
    'SELECT * FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC',
    [session.organization_id]
  );

  return NextResponse.json({ stages });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can add or edit CRM stages.' }, { status: 403 });
  }

  const { name, is_final_won, is_final_lost } = await req.json();
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Stage name is required.' }, { status: 400 });
  }

  const countObj = await get<{ count: number }>('SELECT COUNT(*) as count FROM crm_stages WHERE organization_id = ?', [session.organization_id]);
  const existingCount = countObj?.count || 0;
  const newOrderIndex = existingCount + 1;

  const stageId = cryptoNativeOrRandomUUID();

  try {
    await run(
      `INSERT INTO crm_stages (id, organization_id, name, order_index, is_initial, is_final_won, is_final_lost)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [stageId, session.organization_id, name.trim(), newOrderIndex, is_final_won ? 1 : 0, is_final_lost ? 1 : 0]
    );

    return NextResponse.json({
      message: 'Stage created successfully.',
      stage: {
        id: stageId,
        name: name.trim(),
        order_index: newOrderIndex,
        is_initial: 0,
        is_final_won: is_final_won ? 1 : 0,
        is_final_lost: is_final_lost ? 1 : 0
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Stage already exists' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can modify CRM stages.' }, { status: 403 });
  }

  const { stages } = await req.json();

  if (!Array.isArray(stages)) {
    return NextResponse.json({ error: 'stages array expected.' }, { status: 400 });
  }

  for (const stg of stages) {
    await run(
      `UPDATE crm_stages SET name = ?, order_index = ?, is_final_won = ?, is_final_lost = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?`,
      [stg.name, stg.order_index, stg.is_final_won ? 1 : 0, stg.is_final_lost ? 1 : 0, stg.id, session.organization_id]
    );
  }

  return NextResponse.json({ message: 'CRM stages updated successfully.' });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can delete CRM stages.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const stageId = url.searchParams.get('id');

  if (!stageId) return NextResponse.json({ error: 'Stage ID required.' }, { status: 400 });

  const leadsInStage = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE current_crm_stage_id = ?', [stageId]);
  if (leadsInStage && leadsInStage.count > 0) {
    return NextResponse.json(
      { error: `Cannot delete stage because there are ${leadsInStage.count} leads currently in it. Move those leads to another stage first.` },
      { status: 400 }
    );
  }

  await run('DELETE FROM crm_stages WHERE id = ? AND organization_id = ?', [stageId, session.organization_id]);

  return NextResponse.json({ message: 'Stage deleted successfully.' });
}
