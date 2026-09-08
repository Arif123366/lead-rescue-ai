/**
 * server/routes/webhooks.js
 * Express router for /api/v1/webhooks
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { get, run } = require('../../lib/db/db');
const { leadQueue } = require('../lib/queue/asyncQueue');
const { generateWhatsAppResponse } = require('../../lib/ai/whatsappBot');
const { sendWhatsAppMessage } = require('../../lib/integrations/wasender');
const { processStripeWebhookPayload } = require('../../lib/payments/stripe');
const { processPayoneerWebhookPayload } = require('../../lib/payments/payoneer');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>?/gm, '').trim();
}

// ─── Enable CORS & Preflight for Webhooks ───────────────────────────────────
// Webhooks are public endpoints called by external platforms (Facebook, Zapier, Webflow, WordPress, etc.)
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-lead-rescue-signature, x-hub-signature-256');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

function extractLeadFromPayload(rawBody) {
  let body = rawBody || {};
  let payload = body.data || body.lead || body.fields || body;

  // Facebook Lead Ads webhook format: entry[0].changes[0].value.field_data
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.value && Array.isArray(change.value.field_data)) {
            payload = { ...payload };
            for (const field of change.value.field_data) {
              if (field.name && Array.isArray(field.values) && field.values.length > 0) {
                payload[field.name] = field.values[0];
              }
            }
          }
        }
      }
    }
  }

  // Typeform webhook format: form_response.answers
  if (body.form_response && Array.isArray(body.form_response.answers)) {
    payload = { ...payload };
    for (const ans of body.form_response.answers) {
      const val = ans.text || ans.email || ans.phone_number || ans.choice?.label || ans.number;
      const key = ans.field?.title || ans.field?.ref || ans.type;
      if (key && val) payload[key] = val;
    }
  }

  // Normalize all keys (lowercase and stripped of spaces/dashes/underscores)
  const normalized = {};
  if (typeof payload === 'object' && payload !== null) {
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) {
        const cleanKey = k.toLowerCase().replace(/[\s\-_]/g, '');
        normalized[cleanKey] = v;
      }
    }
  }

  const findVal = (keys) => {
    for (const k of keys) {
      const clean = k.toLowerCase().replace(/[\s\-_]/g, '');
      if (normalized[clean] !== undefined) return String(normalized[clean]).trim();
    }
    return undefined;
  };

  const firstName = findVal(['first_name', 'firstname', 'fname', 'first', 'given_name']) || '';
  const lastName = findVal(['last_name', 'lastname', 'lname', 'last', 'surname', 'family_name']) || '';

  let name = findVal(['name', 'full_name', 'fullname', 'contact_name', 'client_name', 'your_name', 'lead_name', 'user_name']);
  if (!name && (firstName || lastName)) {
    name = `${firstName} ${lastName}`.trim();
  }

  const email = findVal(['email', 'email_address', 'emailaddress', 'contact_email', 'your_email', 'mail', 'user_email']);
  const phone = findVal(['phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'contact_phone', 'tel', 'telephone', 'whatsapp']);
  const company = findVal(['company', 'company_name', 'companyname', 'organization', 'org_name', 'business_name', 'agency']);
  const notes = findVal(['notes', 'message', 'product_interest', 'interest', 'subject', 'comments', 'inquiry', 'body', 'description', 'details']) || 'Inbound Webhook Lead';
  const dealValueStr = findVal(['deal_value', 'dealvalue', 'estimated_budget', 'budget', 'amount', 'value', 'price', 'revenue']);
  const dealValue = dealValueStr ? parseFloat(dealValueStr) || undefined : undefined;

  if (!name) {
    if (email) {
      const prefix = email.split('@')[0].replace(/[._-]/g, ' ');
      name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    } else if (phone) {
      name = `Inbound Lead (${phone})`;
    } else {
      name = 'Inbound Webhook Lead';
    }
  }

  return {
    name: sanitize(name),
    email: email ? sanitize(email) : undefined,
    phone: phone ? sanitize(phone) : undefined,
    company: company ? sanitize(company) : undefined,
    productInterest: sanitize(notes),
    dealValue: dealValue || undefined
  };
}

// ─── Lead Source Webhooks ───────────────────────────────────────────────────

router.get('/lead-source/:id', async (req, res) => {
  try {
    // Facebook Webhook Verification Handshake
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.challenge']) {
      return res.status(200).send(req.query['hub.challenge']);
    }

    const source = await get('SELECT id, name, type, is_active, configuration FROM lead_sources WHERE id = ?', [req.params.id]);
    if (!source || !source.is_active) {
      return res.status(404).json({ status: 'inactive', error: 'Lead source webhook is inactive or not found.' });
    }

    let config = {};
    try { config = typeof source.configuration === 'string' ? JSON.parse(source.configuration) : (source.configuration || {}); } catch {}

    return res.json({
      status: 'active',
      message: 'Lead Rescue AI Webhook Endpoint Ready.',
      source_id: source.id,
      source_name: source.name,
      source_type: source.type,
      total_received: config.total_received || 0,
      last_received_at: config.last_received_at || null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Webhook status check failed' });
  }
});

// ─── Direct Lead Capture Webhook ────────────────────────────────────────────

router.post('/leads', async (req, res) => {
  try {
    const signature = req.headers['x-lead-rescue-signature'] || req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.WEBHOOK_SECRET || 'lead_rescue_webhook_secret_key';

    if (signature) {
      const computed = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
      const expected = signature.replace(/^sha256=/i, '');
      if (computed !== expected && signature !== computed) {
        return res.status(401).json({ error: 'Invalid HMAC SHA-256 signature' });
      }
    }

    const extracted = extractLeadFromPayload(req.body);

    let source = await get("SELECT * FROM lead_sources WHERE is_active = 1 LIMIT 1");
    if (!source) {
      return res.status(400).json({ error: 'No active lead source found.' });
    }

    const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [source.organization_id])
      || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [source.organization_id]);

    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, NOW(), NOW())`,
      [
        leadId,
        source.organization_id,
        extracted.name,
        extracted.email || null,
        extracted.phone || null,
        extracted.company || null,
        extracted.productInterest,
        source.id,
        initialStage?.id || null,
        extracted.dealValue || null,
        extracted.productInterest || null
      ]
    );

    const jobId = leadQueue.enqueue('QUALIFY_LEAD', {
      leadId,
      name: extracted.name,
      email: extracted.email,
      phone: extracted.phone,
      company: extracted.company,
      product_interest: extracted.productInterest,
      source_name: source.name
    });

    return res.status(202).json({
      success: true,
      message: 'Lead captured successfully via /api/v1/webhooks/leads and queued for AI qualification.',
      lead_id: leadId,
      job_id: jobId
    });
  } catch (err) {
    console.error('[Webhooks POST /leads Error]:', err);
    return res.status(500).json({ error: err.message || 'Error processing lead webhook' });
  }
});

router.post('/lead-source/:id', async (req, res) => {
  try {
    const source = await get('SELECT * FROM lead_sources WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!source) {
      return res.status(404).json({ error: 'Invalid or inactive lead source webhook endpoint.' });
    }

    // Optional HMAC signature check if header exists
    const signature = req.headers['x-lead-rescue-signature'] || req.headers['x-hub-signature-256'];
    let sourceConfig = {};
    try { sourceConfig = typeof source.configuration === 'string' ? JSON.parse(source.configuration) : (source.configuration || {}); } catch {}

    const secretKey = sourceConfig.secret || sourceConfig.webhook_secret;
    if (secretKey && signature) {
      const computed = crypto.createHmac('sha256', secretKey).update(JSON.stringify(req.body)).digest('hex');
      const expected = signature.replace(/^sha256=/i, '');
      if (computed !== expected && signature !== computed) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    const extracted = extractLeadFromPayload(req.body);

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
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, NOW(), NOW())`,
      [
        leadId,
        source.organization_id,
        extracted.name,
        extracted.email || null,
        extracted.phone || null,
        extracted.company || null,
        extracted.productInterest,
        source.id,
        initialStage?.id || null,
        extracted.dealValue || null,
        extracted.productInterest || null
      ]
    );

    // Update telemetry on source configuration
    try {
      const updatedConfig = {
        ...sourceConfig,
        total_received: (sourceConfig.total_received || 0) + 1,
        last_received_at: new Date().toISOString(),
        last_payload_preview: {
          name: extracted.name,
          email: extracted.email || null,
          phone: extracted.phone || null,
          timestamp: new Date().toISOString()
        }
      };
      await run('UPDATE lead_sources SET configuration = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(updatedConfig), source.id]);
    } catch (telemetryErr) {
      console.warn('[Webhook Telemetry Error]:', telemetryErr.message);
    }

    const jobId = leadQueue.enqueue('QUALIFY_LEAD', {
      leadId,
      name: extracted.name,
      email: extracted.email,
      phone: extracted.phone,
      company: extracted.company,
      product_interest: extracted.productInterest,
      source_name: source.name
    });

    return res.status(202).json({
      success: true,
      message: 'Lead captured successfully via webhook and queued for AI qualification.',
      lead_id: leadId,
      job_id: jobId,
      lead: {
        name: extracted.name,
        email: extracted.email,
        phone: extracted.phone,
        company: extracted.company,
        deal_value: extracted.dealValue,
        source_name: source.name
      }
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
