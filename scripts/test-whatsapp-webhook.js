/**
 * scripts/test-whatsapp-webhook.js
 * Test script to simulate an inbound WhatsApp message from a lead.
 */

async function testWhatsAppWebhook() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('📱 Testing Automated WhatsApp Bot Auto-Responder Webhook');
  console.log('────────────────────────────────────────────────────────────\n');

  const payload = {
    event: 'messages.upsert',
    data: {
      key: {
        remoteJid: '14155552671@s.whatsapp.net',
        fromMe: false,
      },
      pushName: 'Sarah Jenkins',
      message: {
        conversation: 'Hi! We are interested in your Enterprise Lead Rescue software. What are your pricing plans?',
      },
    },
  };

  const res = await fetch('http://localhost:3000/api/v1/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const status = res.status;
  const data = await res.json().catch(() => ({}));

  console.log(`Response Status: ${status}`);
  console.log('Response Body:', JSON.stringify(data, null, 2));

  if (status === 201 || status === 200) {
    console.log('\n✅ Automated WhatsApp Webhook Test Successful!');
  } else {
    console.log('\n❌ Webhook test failed.');
  }
}

testWhatsAppWebhook();
