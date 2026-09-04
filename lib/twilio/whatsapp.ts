export interface SendWhatsAppInput {
  to: string; // phone number (e.g. +15550199 or whatsapp:+15550199)
  message: string;
}

export async function sendWhatsAppMessage(input: SendWhatsAppInput): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const wasenderApiKey = process.env.WASENDER_API_KEY;
  const wasenderSession = process.env.WASENDER_SESSION_NAME || process.env.WASENDER_SESSION_ID || 'My WhatsApp Session';

  // 1. WasenderAPI Integration (QR Code Scan WhatsApp Provider)
  if (wasenderApiKey) {
    try {
      const cleanPhone = input.to.replace('whatsapp:', '').replace(/[^0-9]/g, '');
      const response = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wasenderApiKey}`,
          'X-API-KEY': wasenderApiKey
        },
        body: JSON.stringify({
          session: wasenderSession,
          to: cleanPhone,
          text: input.message,
          message: input.message
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok || data.status === 'success' || data.success) {
        return { success: true, messageSid: data.id || data.messageId || `wasender_${Date.now()}` };
      } else {
        console.error('[WasenderAPI Send Error]:', data);
      }
    } catch (err: any) {
      console.error('[WasenderAPI Exception]:', err);
    }
  }

  // 2. Twilio WhatsApp Integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  let fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

  if (!fromNumber.startsWith('whatsapp:')) {
    fromNumber = `whatsapp:${fromNumber}`;
  }

  let toNumber = input.to;
  if (!toNumber.startsWith('whatsapp:')) {
    toNumber = `whatsapp:${toNumber}`;
  }

  if (accountSid && authToken && accountSid.startsWith('AC')) {
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: input.message
        }).toString()
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, messageSid: data.sid };
      } else {
        console.error('Twilio WhatsApp Send Error:', data);
        return { success: false, error: data.message || 'Twilio API Error' };
      }
    } catch (err: any) {
      console.error('Twilio fetch error:', err);
      return { success: false, error: err.message };
    }
  }

  // 3. Simulated Outbound Log (Fallback for dev & testing)
  console.log(`[WhatsApp Outbound Simulated] To: ${toNumber} | Message: ${input.message.substring(0, 100)}...`);
  return { success: true, messageSid: `SM_simulated_${Date.now()}` };
}
