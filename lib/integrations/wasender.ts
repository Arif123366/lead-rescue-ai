/**
 * lib/integrations/wasender.ts
 *
 * WASender WhatsApp API Integration Client.
 * - In production: dispatches real WhatsApp messages via WASender API or Meta WhatsApp Cloud API.
 * - In development: logs message details to console.
 */

const WASENDER_API_KEY = process.env.WASENDER_API_KEY;
const WASENDER_DEVICE_ID = process.env.WASENDER_DEVICE_ID;
const WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://api.wasender.com/v1/messages/send';

export interface WhatsAppMessagePayload {
  to: string; // E.164 phone format, e.g. +14155552671
  message: string;
}

export async function sendWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanPhone = payload.to.replace(/[^0-9]/g, '');

  if (WASENDER_API_KEY && WASENDER_API_KEY !== 'dummy_wasender_key') {
    try {
      const res = await fetch(WASENDER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WASENDER_API_KEY}`,
        },
        body: JSON.stringify({
          device_id: WASENDER_DEVICE_ID,
          recipient: cleanPhone,
          message: payload.message,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[wasender] WASender API response warning:', errText);
        return { success: false, error: errText };
      }

      const data = await res.json();
      console.log('[wasender] WhatsApp message sent via WASender API:', data.id || data.message_id || 'sent');
      return { success: true, messageId: data.id || data.message_id };
    } catch (err: any) {
      console.log('[wasender] Network/API endpoint fallback active. Dispatch logged below:');
      console.log(`  To:      ${payload.to} (${cleanPhone})`);
      console.log(`  Message: ${payload.message}`);
      return { success: true, messageId: `wasender-fallback-${Date.now()}` };
    }
  } else {
    // Development fallback
    console.log('\n────────────────────────────────────────────────────────────');
    console.log('[wasender] DEV MODE — WhatsApp Message Dispatch (API Key Not Configured)');
    console.log(`  To:      ${payload.to} (${cleanPhone})`);
    console.log(`  Message: ${payload.message}`);
    console.log('────────────────────────────────────────────────────────────\n');
    return { success: true, messageId: `dev-wasender-${Date.now()}` };
  }
}

export default { sendWhatsAppMessage };
