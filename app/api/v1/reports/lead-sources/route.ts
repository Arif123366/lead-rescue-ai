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
       ls.id as source_id,
       ls.name as source_name,
       ls.type as source_type,
       COUNT(l.id) as total_leads,
       SUM(CASE WHEN l.qualification_status = 'Hot' THEN 1 ELSE 0 END) as hot_leads,
       SUM(CASE WHEN l.qualification_status = 'Warm' THEN 1 ELSE 0 END) as warm_leads,
       AVG(COALESCE(l.qualification_score, 0)) as avg_qualification_score,
       SUM(COALESCE(l.deal_value, 0)) as total_deal_value
     FROM lead_sources ls
     LEFT JOIN leads l ON ls.id = l.source_id ${dateFilter}
     WHERE ls.organization_id = ?
     GROUP BY ls.id, ls.name, ls.type
     ORDER BY total_leads DESC`;

  const sourcesPerformance = await query<any>(sql, params);

  return NextResponse.json({
    sources_performance: sourcesPerformance.map((s) => ({
      ...s,
      avg_qualification_score: Math.round((s.avg_qualification_score || 0) * 10) / 10,
    })),
  });
}
