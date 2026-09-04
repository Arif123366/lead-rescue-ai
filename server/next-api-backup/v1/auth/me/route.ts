import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await get<any>('SELECT id, email, name, organization_id, role, created_at FROM users WHERE id = ?', [session.id]);
  const org = await get<any>('SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit FROM organizations o JOIN subscription_plans sp ON o.subscription_plan_id = sp.id WHERE o.id = ?', [session.organization_id]);

  return NextResponse.json({
    user,
    organization: org
  });
}
