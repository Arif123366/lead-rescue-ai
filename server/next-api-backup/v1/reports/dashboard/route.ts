import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = session.organization_id;

  const totalLeadsObj = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [orgId]);
  const totalLeads = totalLeadsObj?.count || 0;

  const hotLeadsObj = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Hot\'', [orgId]);
  const warmLeadsObj = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Warm\'', [orgId]);
  const coldLeadsObj = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Cold\'', [orgId]);

  const pipelineValueObj = await get<{ total: number }>('SELECT SUM(COALESCE(deal_value, 0)) as total FROM leads WHERE organization_id = ?', [orgId]);
  const totalPipelineValue = pipelineValueObj?.total || 0;

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const needsAttentionObj = await get<{ count: number }>(
    `SELECT COUNT(*) as count FROM leads 
     WHERE organization_id = ? 
       AND qualification_status IN ('Hot', 'Warm') 
       AND (last_contacted_at IS NULL OR last_contacted_at <= ?)
       AND opt_out_communications = 0`,
    [orgId, cutoff48h]
  );

  const stageVelocity = await query<any>(
    `SELECT cs.id as stage_id, cs.name as stage_name, COUNT(l.id) as lead_count, SUM(COALESCE(l.deal_value, 0)) as total_value
     FROM crm_stages cs
     LEFT JOIN leads l ON cs.id = l.current_crm_stage_id
     WHERE cs.organization_id = ?
     GROUP BY cs.id, cs.name, cs.order_index
     ORDER BY cs.order_index ASC`,
    [orgId]
  );

  const recentLeads = await query<any>(
    `SELECT l.id, l.name, l.company, l.qualification_score, l.qualification_status, l.created_at, cs.name as stage_name
     FROM leads l
     LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
     WHERE l.organization_id = ?
     ORDER BY l.created_at DESC
     LIMIT 5`,
    [orgId]
  );

  return NextResponse.json({
    metrics: {
      total_leads: totalLeads,
      hot_leads: hotLeadsObj?.count || 0,
      warm_leads: warmLeadsObj?.count || 0,
      cold_leads: coldLeadsObj?.count || 0,
      total_pipeline_value: totalPipelineValue,
      leads_needing_attention: needsAttentionObj?.count || 0
    },
    stage_velocity: stageVelocity,
    recent_leads: recentLeads
  });
}
