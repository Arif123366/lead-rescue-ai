/**
 * server/routes/webhooks.js
 * Express router for /api/v1/webhooks
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { get, run } = require('../../lib/db/db');
const { qualifyLead } = require('../../lib/ai/qualification');
const { generateWhatsAppResponse } = require('../../lib/ai/whatsappBot');
const { sendWhatsAppMessage } = require('../../lib/integrations/wasender');
const { processStripeWebhookPayload } = require('../../lib/payments/stripe');
const { processPayoneerWebhookPayload } = require('../../lib/payments/payoneer');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>?/gm, '').trim();
}

// ─── Lead Source Webhooks ───────────────────────────────────────────────────

router.get('/lead-source/:id', async (req, res) => {
  try {
    const source = await get('SELECT id, name, type, is_active FROM lead_sources WHERE id = ?', [req.params.id]);
    if (!source || !source.is_active) {
      return res.status(404).json({ status: 'inactive', error: 'Lead source webhook is inactive or not found.' });
    }

    return res.json({
      status: 'active',
      message: 'Lead Rescue AI Webhook Endpoint Ready.',
      source_id: source.id,
      source_name: source.name,
      source_type: source.type
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Webhook status check failed' });
  }
});

router.post('/lead-source/:id', async (req, res) => {
  try {
    const source = await get('SELECT * FROM lead_sources WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!source) {
      return res.status(404).json({ error: 'Invalid or inactive lead source webhook endpoint.' });
    }

    // Optional HMAC signature check if header exists
    const signature = req.headers['x-lead-rescue-signature'];
    let sourceConfig = {};
    try { sourceConfig = JSON.parse(source.configuration || '{}'); } catch {}

    if (sourceConfig.secret && signature) {
      const computed = crypto.createHmac('sha256', sourceConfig.secret).update(JSON.stringify(req.body)).digest('hex');
      if (computed !== signature) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    let name = 'Inbound Lead';
    let email, phone, company;
    let productInterest = 'Inbound Inquiry';
    let dealValue;

    const payload = req.body.data || req.body.lead || req.body.fields || req.body;

    const firstName = sanitize(payload.first_name || payload.firstname || '');
    const lastName = sanitize(payload.last_name || payload.lastname || '');

    if (payload.name || payload.full_name || payload.contact_name) {
      name = sanitize(payload.name || payload.full_name || payload.contact_name);
    } else if (firstName || lastName) {
      name = `${firstName} ${lastName}`.trim();
    }

    email = sanitize(payload.email || payload.email_address || payload.contact_email || undefined);
    phone = sanitize(payload.phone || payload.phone_number || payload.mobile || payload.contact_phone || undefined);
    company = sanitize(payload.company || payload.company_name || payload.organization || undefined);
    productInterest = sanitize(payload.product_interest || payload.interest || payload.message || payload.notes || payload.subject || 'Inbound Webhook Inquiry');
    dealValue = parseFloat(payload.deal_value || payload.estimated_budget || payload.budget || '0') || undefined;

    const orgInfo = await get(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [source.organization_id]
    );

    if (orgInfo && parseInt(orgInfo.actual_leads, 10) >= orgInfo.lead_limit) {
      return res.status(400).json({
        error: `Organization lead limit of ${orgInfo.lead_limit} reached. Webhook payload rejected.`
      });
    }

    const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [source.organization_id])
      || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [source.organization_id]);

    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, NOW(), NOW())`,
      [
        leadId,
        source.organization_id,
        name,
        email || null,
        phone || null,
        company || null,
        productInterest,
        source.id,
        initialStage?.id || null,
        dealValue || null
      ]
    );

    await run("UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?", [source.organization_id]);

    qualifyLead({
      leadId,
      name,
      email,
      phone,
      company,
      product_interest: productInterest,
      source_name: source.name
    }).catch(err => console.error('[Webhook AI Qualification Error]:', err));

    return res.status(201).json({
      success: true,
      message: 'Lead captured successfully via webhook.',
      lead_id: leadId
    });
  } catch (error) {
    console.error('[Lead Source Webhook Exception]:', error);
    return res.status(500).json({ error: error.message || 'Error processing webhook payload' });
  }
});

// ─── Payment Webhooks ────────────────────────────────────────────────────────

router.get('/stripe', (req, res) => {
  return res.json({ status: 'active', provider: 'Stripe', message: 'Stripe Webhook Listener Ready.' });
});

router.post('/stripe', async (req, res) => {
  try {
    const result = await processStripeWebhookPayload(req.body || {});
    return res.json({ received: true, processed: result.success });
  } catch (err) {
    console.error('[Stripe Webhook Error]:', err);
    return res.status(400).json({ error: err.message || 'Stripe Webhook Error' });
  }
});

router.get('/payoneer', (req, res) => {
  return res.json({ status: 'active', provider: 'Payoneer', message: 'Payoneer Webhook Listener Ready.' });
});

router.post('/payoneer', async (req, res) => {
  try {
    const result = await processPayoneerWebhookPayload(req.body || {});
    return res.json({ received: true, processed: result.success });
  } catch (err) {
    console.error('[Payoneer Webhook Error]:', err);
    return res.status(400).json({ error: err.message || 'Payoneer Webhook Error' });
  }
});

// ─── WhatsApp Webhook ────────────────────────────────────────────────────────

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'lead_rescue_ai_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.json({
    status: 'active',
    service: 'Lead Rescue AI WhatsApp Integration',
  });
});

router.post('/whatsapp', async (req, res) => {
  try {
    let name = 'WhatsApp Contact';
    let phone;
    let messageText = 'WhatsApp Inbound Inquiry';

    const body = req.body || {};
    if (body.event === 'messages.upsert' || body.data?.key?.remoteJid || body.pushName) {
      const data = body.data || body;
      const key = data.key || {};

      if (key.fromMe) {
        return res.json({ status: 'ignored', reason: 'outbound_from_me' });
      }

      const remoteJid = key.remoteJid || body.sender || body.from || '';
      phone = remoteJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
      if (phone) phone = `+${phone}`;

      name = data.pushName || body.pushName || 'WhatsApp Contact';
      messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || body.message || 'Inbound WhatsApp Message';
    } else {
      name = body.name || 'WhatsApp Contact';
      phone = body.phone || body.from || undefined;
      messageText = body.message || body.body || 'WhatsApp Inquiry';
    }

    let source = await get("SELECT * FROM lead_sources WHERE type = 'WhatsApp' AND is_active = 1 LIMIT 1")
      || await get("SELECT * FROM lead_sources WHERE is_active = 1 LIMIT 1");

    if (!source) {
      return res.status(400).json({ error: 'No active lead source configured for WhatsApp integration.' });
    }

    const orgId = source.organization_id;

    let existingLead = phone ? await get('SELECT * FROM leads WHERE organization_id = ? AND phone = ? LIMIT 1', [orgId, phone]) : null;
    let leadId = existingLead?.id;

    if (!existingLead) {
      const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [orgId])
        || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [orgId]);

      leadId = cryptoNativeOrRandomUUID();

      await run(
        `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
         VALUES (?, ?, ?, null, ?, null, ?, ?, 0, 'Pending', ?, 5000, NOW(), NOW())`,
        [leadId, orgId, name, phone || null, messageText, source.id, initialStage?.id || null]
      );

      await run('UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?', [orgId]);
    }

    const inboundMsgId = cryptoNativeOrRandomUUID();
    await run(
      `INSERT INTO follow_up_messages (id, lead_id, sent_at, message, message_content, channel, status, direction, created_at, updated_at)
       VALUES (?, ?, NOW(), ?, ?, 'WhatsApp', 'Received', 'Inbound', NOW(), NOW())`,
      [inboundMsgId, leadId, messageText, messageText]
    );

    qualifyLead({
      leadId,
      name,
      phone,
      product_interest: messageText,
      source_name: source.name || 'WhatsApp Auto-Responder',
    }).catch(err => console.error('[WhatsApp AI Qualification Error]:', err));

    setTimeout(async () => {
      try {
        const aiReply = await generateWhatsAppResponse({
          leadId,
          organizationId: orgId,
          incomingMessage: messageText,
          leadName: name,
        });

        const outboundMsgId = cryptoNativeOrRandomUUID();
        await run(
          `INSERT INTO follow_up_messages (id, lead_id, sent_at, message, message_content, channel, status, direction, created_at, updated_at)
           VALUES (?, ?, NOW(), ?, ?, 'WhatsApp', 'Sent', 'Outbound', NOW(), NOW())`,
          [outboundMsgId, leadId, aiReply, aiReply]
        );

        await run(`UPDATE leads SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = ?`, [leadId]);

        if (phone) {
          await sendWhatsAppMessage({ to: phone, message: aiReply });
        }
      } catch (err) {
        console.error('[WhatsApp AI Auto-Responder Error]:', err);
      }
    }, 0);

    return res.status(201).json({
      success: true,
      message: 'Inbound WhatsApp message processed & AI auto-reply triggered.',
      lead_id: leadId,
    });
  } catch (err) {
    console.error('[WhatsApp Webhook Exception]:', err);
    return res.status(500).json({ error: err.message || 'Error processing WhatsApp payload' });
  }
});

module.exports = router;
