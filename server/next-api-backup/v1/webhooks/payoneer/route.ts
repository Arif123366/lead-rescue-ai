import { NextRequest, NextResponse } from 'next/server';
import { processPayoneerWebhookPayload } from '@/lib/payments/payoneer';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    provider: 'Payoneer',
    message: 'Payoneer Webhook Listener Ready.'
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const result = await processPayoneerWebhookPayload(payload);

    return NextResponse.json({ received: true, processed: result.success });
  } catch (err: any) {
    console.error('[Payoneer Webhook Exception]:', err);
    return NextResponse.json({ error: err.message || 'Payoneer Webhook Handler Error' }, { status: 400 });
  }
}
