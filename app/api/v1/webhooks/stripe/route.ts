import { NextRequest, NextResponse } from 'next/server';
import { processStripeWebhookPayload } from '@/lib/payments/stripe';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    provider: 'Stripe',
    message: 'Stripe Webhook Listener Ready.'
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const result = await processStripeWebhookPayload(payload);

    return NextResponse.json({ received: true, processed: result.success });
  } catch (err: any) {
    console.error('[Stripe Webhook Exception]:', err);
    return NextResponse.json({ error: err.message || 'Stripe Webhook Handler Error' }, { status: 400 });
  }
}
