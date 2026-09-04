import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { runLeadRescueScan } from '@/lib/ai/rescue';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const hoursThreshold = parseInt(url.searchParams.get('hours') || '48', 10);

  const atRiskLeads = await runLeadRescueScan(session.organization_id, hoursThreshold);

  const totalRescuableValue = atRiskLeads.reduce((acc, l) => acc + (l.deal_value || 0), 0);

  return NextResponse.json({
    at_risk_leads: atRiskLeads,
    total_count: atRiskLeads.length,
    total_rescuable_value: totalRescuableValue,
    threshold_hours: hoursThreshold
  });
}
