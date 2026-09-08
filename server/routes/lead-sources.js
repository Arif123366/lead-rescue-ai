/**
 * server/routes/lead-sources.js
 * Express router for /api/v1/lead-sources
 * Production-Ready Webhook URL & Secret Generator
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { query, get, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');

function getFullWebhookUrl(req, sourceId) {
  const forwardedProto = req && req.headers ? req.headers['x-forwarded-proto'] : null;
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : (req && req.protocol ? req.protocol : 'https');
  const host = req && req.get ? req.get('host') : (req && req.headers ? req.headers.host : null);
  const detectedBase = host ? `${protocol}://${host}` : 'https://lead-rescue-ai-backend.onrender.com';
  const baseUrl = process.env.BACKEND_URL || process.env.API_URL || detectedBase;
  return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/lead-source/${sourceId}`;
}

// GET /api/v1/lead-sources
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const sources = await query(
      'SELECT * FROM lead_sources WHERE organization_id = ? ORDER BY created_at DESC',
      [session.organization_id]
    );

    return res.json({
      sources: sources.map(s => {
        let parsedConfig = {};
        try { parsedConfig = typeof s.configuration === 'string' ? JSON.parse(s.configuration) : (s.configuration || {}); } catch {}
        const isWebhook = s.type !== 'Manual';
        const fullUrl = isWebhook ? getFullWebhookUrl(req, s.id) : null;
        const secret = parsedConfig.secret || parsedConfig.webhook_secret || '';

        return {
          ...s,
          configuration: {
            ...parsedConfig,
            webhook_url: fullUrl,
            webhook_secret: secret
          }
        };
      })
    });
  } catch (err) {
    console.error('[lead-sources GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/lead-sources
router.post('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (!['Organization Owner', 'Marketing Manager'].includes(session.role)) {
      return res.status(403).json({ error: 'Only Organization Owners and Marketing Managers can add lead sources.' });
    }

    const { name, type, configuration } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required.' });
    }

    const sourceId = crypto.randomUUID();
    const fullWebhookUrl = getFullWebhookUrl(req, sourceId);
    const generatedSecret = crypto.randomBytes(20).toString('hex');

    const finalConfig = {
      webhook_url: fullWebhookUrl,
      secret: generatedSecret,
      webhook_secret: generatedSecret,
      ...(configuration || {})
    };

    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        sourceId,
        session.organization_id,
        name,
        type,
        JSON.stringify(finalConfig)
      ]
    );

    return res.status(201).json({
      message: 'Lead source created successfully.',
      source_id: sourceId,
      webhook_url: fullWebhookUrl,
      webhook_secret: generatedSecret,
      source: {
        id: sourceId,
        organization_id: session.organization_id,
        name,
        type,
        is_active: 1,
        configuration: finalConfig
      }
    });
  } catch (err) {
    console.error('[lead-sources POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/lead-sources/:id
router.put('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (!['Organization Owner', 'Marketing Manager'].includes(session.role)) {
      return res.status(403).json({ error: 'Only Organization Owners and Marketing Managers can edit lead sources.' });
    }

    const { name, type, configuration, is_active } = req.body;

    const src = await get('SELECT id, configuration FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!src) return res.status(404).json({ error: 'Lead source not found.' });

    let existingConfig = {};
    try { existingConfig = typeof src.configuration === 'string' ? JSON.parse(src.configuration) : (src.configuration || {}); } catch {}

    const updatedConfig = configuration ? { ...existingConfig, ...configuration } : existingConfig;
    if (!updatedConfig.webhook_url) {
      updatedConfig.webhook_url = getFullWebhookUrl(req, req.params.id);
    }
    if (!updatedConfig.secret && !updatedConfig.webhook_secret) {
      const secret = crypto.randomBytes(20).toString('hex');
      updatedConfig.secret = secret;
      updatedConfig.webhook_secret = secret;
    }

    await run(
      `UPDATE lead_sources 
       SET name = COALESCE(?, name),
           type = COALESCE(?, type),
           configuration = ?,
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ? AND organization_id = ?`,
      [
        name ?? null,
        type ?? null,
        JSON.stringify(updatedConfig),
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        req.params.id,
        session.organization_id
      ]
    );

    return res.json({
      message: 'Lead source updated successfully.',
      webhook_url: updatedConfig.webhook_url,
      webhook_secret: updatedConfig.secret || updatedConfig.webhook_secret
    });
  } catch (err) {
    console.error('[lead-sources PUT :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/lead-sources/:id
router.delete('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (!['Organization Owner', 'Marketing Manager'].includes(session.role)) {
      return res.status(403).json({ error: 'Only Organization Owners and Marketing Managers can delete lead sources.' });
    }

    const src = await get('SELECT id FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!src) return res.status(404).json({ error: 'Lead source not found.' });

    await run('DELETE FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);

    return res.json({ message: 'Lead source deleted successfully.' });
  } catch (err) {
    console.error('[lead-sources DELETE :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/lead-sources/:id/test
// Ingests a simulated verified lead so the user can verify the webhook & AI qualification pipeline directly from the UI
router.post('/:id/test', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const source = await get('SELECT * FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!source) return res.status(404).json({ error: 'Lead source not found.' });

    const testLeadName = req.body?.name || `Verified Test Lead (${source.name})`;
    const testEmail = req.body?.email || `test.lead.${Date.now().toString().slice(-4)}@example.com`;
    const testPhone = req.body?.phone || '+1 (555) 234-5678';
    const testCompany = req.body?.company || 'Enterprise Webhook Test Inc.';
    const testDealValue = parseFloat(req.body?.deal_value || '3500');
    const testProductInterest = req.body?.product_interest || `Inbound inquiry via ${source.name} webhook. Requesting demo and pricing for sales automation.`;

    const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [session.organization_id])
      || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [session.organization_id]);

    const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');
    const { leadQueue } = require('../lib/queue/asyncQueue');
    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, NOW(), NOW())`,
      [
        leadId,
        session.organization_id,
        testLeadName,
        testEmail,
        testPhone,
        testCompany,
        testProductInterest,
        source.id,
        initialStage?.id || null,
        testDealValue,
        testProductInterest
      ]
    );

    // Update telemetry
    let currentConfig = {};
    try { currentConfig = typeof source.configuration === 'string' ? JSON.parse(source.configuration) : (source.configuration || {}); } catch {}
    const updatedConfig = {
      ...currentConfig,
      total_received: (currentConfig.total_received || 0) + 1,
      last_received_at: new Date().toISOString(),
      last_payload_preview: {
        name: testLeadName,
        email: testEmail,
        phone: testPhone,
        timestamp: new Date().toISOString()
      }
    };
    await run('UPDATE lead_sources SET configuration = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(updatedConfig), source.id]);

    const jobId = leadQueue.enqueue('QUALIFY_LEAD', {
      leadId,
      name: testLeadName,
      email: testEmail,
      phone: testPhone,
      company: testCompany,
      product_interest: testProductInterest,
      source_name: source.name
    });

    return res.status(201).json({
      success: true,
      message: `Test lead successfully created and queued for AI qualification for ${source.name}!`,
      lead_id: leadId,
      job_id: jobId,
      lead: {
        name: testLeadName,
        email: testEmail,
        phone: testPhone,
        company: testCompany,
        deal_value: testDealValue
      }
    });
  } catch (err) {
    console.error('[lead-sources POST :id/test]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;


