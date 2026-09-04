import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let dateFilter = '';
  const params: any[] = [session.organization_id];

  if (from) {
    dateFilter += ' AND l.created_at >= ?';
    params.push(from);
  }
  if (to) {
    dateFilter += ' AND l.created_at <= ?';
    params.push(to);
  }

  const sql = `
    SELECT 
       u.id as user_id,
       u.name as user_name,
       u.role,
       COUNT(l.id) as assigned_leads,
       SUM(CASE WHEN l.qualification_status = 'Hot' THEN 1 ELSE 0 END) as hot_leads_managed,
       SUM(COALESCE(l.deal_value, 0)) as total_pipeline_managed,
       SUM(CASE WHEN cs.is_final_won = 1 THEN 1 ELSE 0 END) as deals_won,
       SUM(CASE WHEN cs.is_final_won = 1 THEN COALESCE(l.deal_value, 0) ELSE 0 END) as revenue_closed
     FROM users u
     LEFT JOIN leads l ON u.id = l.assigned_to_user_id ${dateFilter}
     LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
     WHERE u.organization_id = ?
     GROUP BY u.id, u.name, u.role
     ORDER BY revenue_closed DESC, assigned_leads DESC`;

  const salesTeamPerformance = await query<any>(sql, params);

  return NextResponse.json({ sales_team_performance: salesTeamPerformance });
}
