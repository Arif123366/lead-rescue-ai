import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentOrg = await get<any>(
    `SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit, sp.monthly_price, sp.features
     FROM organizations o
     JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
     WHERE o.id = ?`,
    [session.organization_id]
  );

  const availablePlans = await query<any>('SELECT * FROM subscription_plans ORDER BY monthly_price ASC');

  const actualLeads = await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [session.organization_id]);
  const actualUsers = await get<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);

  return NextResponse.json({
    current_subscription: {
      ...currentOrg,
      features: currentOrg.features ? JSON.parse(currentOrg.features) : [],
      actual_leads: actualLeads?.count || 0,
      actual_users: actualUsers?.count || 0
    },
    available_plans: availablePlans.map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : []
    }))
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can change the subscription plan.' }, { status: 403 });
  }

  const { plan_id } = await req.json();
  if (!plan_id) return NextResponse.json({ error: 'plan_id is required.' }, { status: 400 });

  const targetPlan = await get<any>('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!targetPlan) return NextResponse.json({ error: 'Selected subscription plan not found.' }, { status: 404 });

  const actualUsers = await get<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);
  const userCount = actualUsers?.count || 0;

  if (userCount > targetPlan.user_limit) {
    return NextResponse.json(
      { error: `Cannot downgrade to ${targetPlan.name} because your organization has ${userCount} users, but the plan limit is ${targetPlan.user_limit}. Please remove extra team members first.` },
      { status: 400 }
    );
  }

  await run('UPDATE organizations SET subscription_plan_id = ?, updated_at = datetime("now") WHERE id = ?', [plan_id, session.organization_id]);

  return NextResponse.json({
    message: `Subscription successfully updated to ${targetPlan.name}.`,
    plan: {
      ...targetPlan,
      features: targetPlan.features ? JSON.parse(targetPlan.features) : []
    }
  });
}
