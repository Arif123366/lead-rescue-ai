/**
 * scripts/test-payment-webhooks.js
 * Test script to verify live processing of Stripe & Payoneer payment webhooks.
 */

async function testPaymentWebhooks() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('💳 Testing Automated Stripe & Payoneer Payment Webhooks');
  console.log('────────────────────────────────────────────────────────────\n');

  const appUrl = 'http://localhost:3000';

  // 1. Test Stripe Webhook
  console.log('[1/2] Simulating Stripe checkout.session.completed event...');
  const stripePayload = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_stripe_webhook_sample_123',
        client_reference_id: 'org_test_1',
        metadata: {
          organization_id: 'org_test_1',
          plan_id: 'plan_growth',
        },
      },
    },
  };

  const stripeRes = await fetch(`${appUrl}/api/v1/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stripePayload),
  });

  const stripeData = await stripeRes.json().catch(() => ({}));
  console.log(`Stripe Webhook Response (${stripeRes.status}):`, stripeData);

  // 2. Test Payoneer Webhook
  console.log('\n[2/2] Simulating Payoneer CHARGE_APPROVED event...');
  const payoneerPayload = {
    event_type: 'CHARGE_APPROVED',
    session_id: 'payoneer_sample_tx_456',
    status: 'PAID',
  };

  const payoneerRes = await fetch(`${appUrl}/api/v1/webhooks/payoneer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payoneerPayload),
  });

  const payoneerData = await payoneerRes.json().catch(() => ({}));
  console.log(`Payoneer Webhook Response (${payoneerRes.status}):`, payoneerData);

  if (stripeRes.ok && payoneerRes.ok) {
    console.log('\n✅ Payment Webhooks Verified Successfully!');
  } else {
    console.log('\n❌ Payment Webhooks test failed.');
  }
}

testPaymentWebhooks();
