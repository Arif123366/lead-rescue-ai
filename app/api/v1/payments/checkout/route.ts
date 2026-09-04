import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get } from '@/lib/db/db';
import { createStripeCheckoutSession } from '@/lib/payments/stripe';
import { createPayoneerCheckoutSession } from '@/lib/payments/payoneer';

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can initiate subscription upgrades.' }, { status: 403 });
  }

  const { plan_id, payment_provider } = await req.json();

  if (!plan_id) return NextResponse.json({ error: 'plan_id is required.' }, { status: 400 });
  const provider = (payment_provider || 'stripe').toLowerCase();

  if (provider !== 'stripe' && provider !== 'payoneer') {
    return NextResponse.json({ error: 'Unsupported payment provider. Select Stripe or Payoneer.' }, { status: 400 });
  }

  const targetPlan = await get<any>('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!targetPlan) return NextResponse.json({ error: 'Selected subscription plan not found.' }, { status: 404 });

  const originUrl = req.nextUrl.origin || 'http://localhost:3000';

  if (provider === 'stripe') {
    const result = await createStripeCheckoutSession({
      organizationId: session.organization_id,
      planId: targetPlan.id,
      planName: targetPlan.name,
      amount: targetPlan.monthly_price,
      customerEmail: session.email,
      originUrl
    });

    return NextResponse.json({
      success: true,
      provider: 'stripe',
      checkout_url: result.checkoutUrl,
      session_id: result.sessionId
    });
  } else {
    const result = await createPayoneerCheckoutSession({
      organizationId: session.organization_id,
      planId: targetPlan.id,
      planName: targetPlan.name,
      amount: targetPlan.monthly_price,
      customerEmail: session.email,
      originUrl
    });

    return NextResponse.json({
      success: true,
      provider: 'payoneer',
      checkout_url: result.checkoutUrl,
      session_id: result.sessionId
    });
  }
}
