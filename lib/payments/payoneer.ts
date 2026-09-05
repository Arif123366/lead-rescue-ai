import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';
import { run } from '@/lib/db/db';

export interface PayoneerCheckoutParams {
  organizationId: string;
  planId: string;
  planName: string;
  amount: number;
  customerEmail: string;
  originUrl: string;
}

export async function createPayoneerCheckoutSession(params: PayoneerCheckoutParams): Promise<{ checkoutUrl: string; sessionId: string }> {
  const payoneerProgramId = process.env.PAYONEER_PROGRAM_ID;
  const sessionId = `payoneer_${cryptoNativeOrRandomUUID().replace(/-/g, '')}`;
  const transactionId = cryptoNativeOrRandomUUID();

  // Record pending transaction in DB
  await run(
    `INSERT INTO payment_transactions (id, organization_id, plan_id, provider, amount, currency, status, checkout_session_id, created_at, updated_at)
     VALUES (?, ?, ?, 'payoneer', ?, 'USD', 'pending', ?, NOW(), NOW())`,
    [transactionId, params.organizationId, params.planId, params.amount, sessionId]
  );

  if (payoneerProgramId) {
    try {
      // Payoneer Payment Request / Checkout REST API simulation call
      const response = await fetch('https://api.payoneer.com/v4/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${process.env.PAYONEER_CLIENT_ID}:${process.env.PAYONEER_CLIENT_SECRET}`).toString('base64')}`
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: 'USD',
          description: `${params.planName} Plan Subscription`,
          payee_id: params.organizationId,
          redirect_url: `${params.originUrl}/settings?tab=billing&payment=success&session_id=${sessionId}`
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.redirect_url) {
          return {
            checkoutUrl: json.redirect_url,
            sessionId: json.charge_id || sessionId
          };
        }
      }
    } catch (err) {
      console.error('Payoneer API error, falling back to direct payment confirmation:', err);
    }
  }

  // Simulated direct Payoneer checkout confirmation link
  const mockCheckoutUrl = `${params.originUrl}/api/v1/payments/checkout/confirm?session_id=${sessionId}&provider=payoneer`;
  return {
    checkoutUrl: mockCheckoutUrl,
    sessionId
  };
}

export async function processPayoneerWebhookPayload(payload: any): Promise<{ success: boolean; organizationId?: string; planId?: string }> {
  const sessionId = payload.session_id || payload.charge_id || payload.payment_id;
  const status = payload.status || payload.event_type;

  if (sessionId && (status === 'PAID' || status === 'COMPLETED' || status === 'CHARGE_APPROVED')) {
    const tx = await run(
      `UPDATE payment_transactions SET status = 'completed', updated_at = NOW() WHERE checkout_session_id = ?`,
      [sessionId]
    );

    if (tx.changes > 0) {
      return { success: true };
    }
  }
  return { success: false };
}
