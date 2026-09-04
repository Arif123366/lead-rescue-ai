import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { qualifyLead } from '@/lib/ai/qualification';
import { generateWhatsAppResponse } from '@/lib/ai/whatsappBot';
import { sendWhatsAppMessage } from '@/lib/integrations/wasender';
import { cryptoNativeOrRandomUUID } from '@/lib/utils/uuid';

// GET Meta WhatsApp Cloud API & WASender Challenge Verification
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'lead_rescue_ai_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook Verified Successfully]');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'active',
    service: 'Lead Rescue AI WhatsApp Integration (WASender, Twilio, Meta Cloud API)',
    webhook_url: req.url,
  });
}

// POST Inbound WhatsApp Message Handler & AI Auto-Responder Engine
export async function POST(req: NextRequest) {
  try {
    let name = 'WhatsApp Contact';
    let phone: string | undefined = undefined;
    let messageText = 'WhatsApp Inbound Inquiry';
    let sourceId: string | null = null;
    let orgId: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      // Twilio WhatsApp Webhook payload format
      const formData = await req.formData();
      const bodyMsg = formData.get('Body')?.toString() || '';
      const fromNum = formData.get('From')?.toString() || '';
      const profileName = formData.get('ProfileName')?.toString();

      if (profileName) name = profileName;
      if (fromNum) phone = fromNum.replace('whatsapp:', '').trim();
      if (bodyMsg) messageText = bodyMsg;
    } else {
      // JSON payload (WASender, Meta Cloud API, or Custom Webhook)
      const body = await req.json().catch(() => ({}));

      // 1. WASender Webhook Payload Format
      if (body.event === 'messages.upsert' || body.data?.key?.remoteJid || body.pushName || body.session) {
        const data = body.data || body;
        const key = data.key || {};

        if (key.fromMe) {
          return NextResponse.json({ status: 'ignored', reason: 'outbound_from_me' });
        }

        const remoteJid = key.remoteJid || body.sender || body.from || '';
        phone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        if (phone) phone = `+${phone}`;

        name = data.pushName || body.pushName || body.senderName || 'WhatsApp Contact';
        messageText =
          data.message?.conversation ||
          data.message?.extendedTextMessage?.text ||
          body.message ||
          body.text ||
          'Inbound WhatsApp Message';
      }
      // 2. Meta WhatsApp Cloud API structure
      else if (body.entry?.[0]) {
        const entry = body.entry[0];
        const change = entry?.changes?.[0]?.value;
        const metaMessage = change?.messages?.[0];
        const metaContact = change?.contacts?.[0];

        if (metaMessage) {
          name = metaContact?.profile?.name || 'WhatsApp Lead';
          phone = metaMessage.from ? `+${metaMessage.from}` : undefined;
          messageText = metaMessage.text?.body || metaMessage.caption || 'Inbound WhatsApp Message';
        }
      }
      // 3. Standard JSON payload format
      else {
        name = body.name || body.profile_name || body.contacts?.[0]?.profile?.name || 'WhatsApp Contact';
        phone = body.phone || body.from || body.messages?.[0]?.from || undefined;
        messageText = body.message || body.body || body.messages?.[0]?.text?.body || 'WhatsApp Inquiry';
        sourceId = body.source_id || null;
      }
    }

    // Find active WhatsApp lead source
    let source: any = null;
    if (sourceId) {
      source = await get<any>('SELECT * FROM lead_sources WHERE id = ? AND is_active = 1', [sourceId]);
    }

    if (!source) {
      source = await get<any>("SELECT * FROM lead_sources WHERE type = 'WhatsApp' AND is_active = 1 LIMIT 1");
    }

    if (!source) {
      source = await get<any>('SELECT * FROM lead_sources WHERE is_active = 1 LIMIT 1');
    }

    if (!source) {
      return NextResponse.json({ error: 'No active lead source configured for WhatsApp integration.' }, { status: 400 });
    }

    orgId = source.organization_id;

    // Check organization lead limit
    const orgInfo = await get<any>(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [orgId]
    );

    if (orgInfo && orgInfo.actual_leads >= orgInfo.lead_limit) {
      return NextResponse.json(
        { error: `Organization lead limit of ${orgInfo.lead_limit} reached. WhatsApp message rejected.` },
        { status: 400 }
      );
    }

    // Check if lead already exists by phone number
    let existingLead: any = null;
    if (phone) {
      existingLead = await get<any>('SELECT * FROM leads WHERE organization_id = ? AND phone = ? LIMIT 1', [orgId, phone]);
    }

    let leadId = existingLead?.id;

    if (!existingLead) {
      const initialStage =
        (await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [orgId])) ||
        (await get<any>('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [orgId]));

      leadId = cryptoNativeOrRandomUUID();

      await run(
        `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
         VALUES (?, ?, ?, null, ?, null, ?, ?, 0, 'Pending', ?, 5000, datetime('now'), datetime('now'))`,
        [leadId, orgId, name, phone || null, messageText, source.id, initialStage?.id || null]
      );

      await run('UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?', [orgId]);
    }

    // 1. Log Inbound WhatsApp Message
    const inboundMsgId = cryptoNativeOrRandomUUID();
    await run(
      `INSERT INTO follow_up_messages (id, lead_id, sent_at, message, message_content, channel, status, direction, created_at, updated_at)
       VALUES (?, ?, datetime('now'), ?, ?, 'WhatsApp', 'Received', 'Inbound', datetime('now'), datetime('now'))`,
      [inboundMsgId, leadId, messageText, messageText]
    );

    // 2. Trigger AI Qualification
    qualifyLead({
      leadId,
      name,
      phone,
      product_interest: messageText,
      source_name: source.name || 'WhatsApp Auto-Responder',
    }).catch((err) => console.error('[WhatsApp AI Qualification Error]:', err));

    // 3. Non-blocking Automated AI Response Generation & Dispatch
    setTimeout(async () => {
      try {
        const aiReply = await generateWhatsAppResponse({
          leadId,
          organizationId: orgId!,
          incomingMessage: messageText,
          leadName: name,
        });

        // Log Outbound AI Reply
        const outboundMsgId = cryptoNativeOrRandomUUID();
        await run(
          `INSERT INTO follow_up_messages (id, lead_id, sent_at, message, message_content, channel, status, direction, created_at, updated_at)
           VALUES (?, ?, datetime('now'), ?, ?, 'WhatsApp', 'Sent', 'Outbound', datetime('now'), datetime('now'))`,
          [outboundMsgId, leadId, aiReply, aiReply]
        );

        // Update lead's last_contacted_at
        await run(`UPDATE leads SET last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [leadId]);

        // Send via WASender if phone is available
        if (phone) {
          await sendWhatsAppMessage({ to: phone, message: aiReply });
        }
      } catch (err) {
        console.error('[WhatsApp AI Auto-Responder Error]:', err);
      }
    }, 0);

    // Return TwiML XML if Twilio request, else JSON
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for reaching out! Our AI assistant is preparing your response.</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Inbound WhatsApp message processed & AI auto-reply triggered.',
        lead_id: leadId,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[WhatsApp Webhook Exception]:', err);
    return NextResponse.json({ error: err.message || 'Error processing WhatsApp payload' }, { status: 500 });
  }
}
