import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, run } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await get<any>(
    `SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit, sp.monthly_price, sp.features
     FROM organizations o
     JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
     WHERE o.id = ?`,
    [session.organization_id]
  );

  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const currentLeads = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [session.organization_id]);
  const currentUsers = await get<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);

  return NextResponse.json({
    organization: {
      ...org,
      features: org.features ? JSON.parse(org.features) : [],
      current_lead_count: currentLeads?.count || 0,
      current_user_count: currentUsers?.count || 0
    }
  });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can update organization details.' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 });
  }

  await run('UPDATE organizations SET name = ?, updated_at = datetime("now") WHERE id = ?', [name.trim(), session.organization_id]);

  return NextResponse.json({ message: 'Organization updated successfully.' });
}
