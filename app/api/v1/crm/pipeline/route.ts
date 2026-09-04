import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stages = await query<any>(
    'SELECT * FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC',
    [session.organization_id]
  );

  const leads = await query<any>(
    `SELECT l.*, 
            ls.name as source_name, 
            u.name as assigned_user_name,
            lqr.analysis_data
     FROM leads l
     LEFT JOIN lead_sources ls ON l.source_id = ls.id
     LEFT JOIN users u ON l.assigned_to_user_id = u.id
     LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
     WHERE l.organization_id = ?
     ORDER BY l.created_at DESC`,
    [session.organization_id]
  );

  const pipeline = stages.map(stage => {
    const stageLeads = leads
      .filter(l => l.current_crm_stage_id === stage.id)
      .map(l => ({
        ...l,
        analysis_data: l.analysis_data ? JSON.parse(l.analysis_data) : null
      }));

    const totalValue = stageLeads.reduce((acc, l) => acc + (l.deal_value || 0), 0);

    return {
      stage,
      leads: stageLeads,
      count: stageLeads.length,
      total_value: totalValue
    };
  });

  return NextResponse.json({ pipeline });
}
