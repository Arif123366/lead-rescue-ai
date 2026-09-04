import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const provider = url.searchParams.get('provider') || 'stripe';

  if (!sessionId) {
    return NextResponse.redirect(new URL('/settings?tab=billing&payment=error', req.url));
  }

  const tx = await get<any>('SELECT * FROM payment_transactions WHERE checkout_session_id = ?', [sessionId]);
  if (!tx) {
    return NextResponse.redirect(new URL('/settings?tab=billing&payment=not_found', req.url));
  }

  const plan = await get<any>('SELECT * FROM subscription_plans WHERE id = ?', [tx.plan_id]);

  // Complete transaction
  await run(
    `UPDATE payment_transactions SET status = 'completed', updated_at = datetime('now') WHERE id = ?`,
    [tx.id]
  );

  // Update organization subscription plan
  await run(
    `UPDATE organizations SET subscription_plan_id = ?, payment_provider = ?, payment_status = 'active', payment_reference_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [tx.plan_id, provider, sessionId, tx.organization_id]
  );

  // Create notification for org owner
  const owner = await get<any>("SELECT id FROM users WHERE organization_id = ? AND role = 'Organization Owner' LIMIT 1", [tx.organization_id]);
  if (owner) {
    await run(
      `INSERT INTO notifications (id, user_id, organization_id, type, message, is_read, created_at, updated_at)
       VALUES (?, ?, ?, 'Payment Success', ?, 0, datetime('now'), datetime('now'))`,
      [
        cryptoNativeOrRandomUUID(),
        owner.id,
        tx.organization_id,
        `🎉 Subscription successfully upgraded to ${plan?.name || 'Pro'} via ${provider.toUpperCase()}!`
      ]
    );
  }

  return NextResponse.redirect(new URL('/settings?tab=billing&payment=success', req.url));
}
