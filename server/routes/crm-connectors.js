/**
 * server/routes/crm-connectors.js
 * Express router for /api/v1/crm-connectors
 */

const express = require('express');
const router = express.Router();

const { query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');
const { syncExternalCrmConnector } = require('../../lib/crm/connectors');

// GET /api/v1/crm-connectors
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const connectors = await query(
      'SELECT id, organization_id, provider, name, sync_frequency_hours, status, last_synced_at, created_at FROM external_crm_connectors WHERE organization_id = ? ORDER BY created_at DESC',
      [session.organization_id]
    );

    return res.json({ connectors });
  } catch (err) {
    console.error('[crm-connectors GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/crm-connectors
router.post('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { provider, name, api_key_or_token, api_endpoint, sync_frequency_hours } = req.body;

    if (!provider || !name || !api_key_or_token) {
      return res.status(400).json({ error: 'provider, name, and api_key_or_token are required.' });
    }

    const connectorId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO external_crm_connectors (id, organization_id, provider, name, api_key_or_token, api_endpoint, sync_frequency_hours, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
      [
        connectorId,
        session.organization_id,
        provider,
        name,
        api_key_or_token,
        api_endpoint || null,
        sync_frequency_hours || 24
      ]
    );

    const syncResult = await syncExternalCrmConnector(connectorId).catch(err => {
      console.error('[CRM Connector Initial Sync Error]:', err);
      return { extractedCount: 0, newLeadsCount: 0 };
    });

    return res.status(201).json({
      message: `External CRM Connector (${provider}) established successfully. Extracted ${syncResult.newLeadsCount} new leads.`,
      connector_id: connectorId,
      sync_summary: syncResult
    });
  } catch (err) {
    console.error('[crm-connectors POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/crm-connectors
router.put('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required to trigger sync.' });

    const syncResult = await syncExternalCrmConnector(id);

    return res.json({
      message: `External CRM data extraction completed. Extracted ${syncResult.extractedCount} items, added ${syncResult.newLeadsCount} new leads.`,
      sync_summary: syncResult
    });
  } catch (err) {
    console.error('[crm-connectors PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/crm-connectors
router.delete('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    await run('DELETE FROM external_crm_connectors WHERE id = ? AND organization_id = ?', [id, session.organization_id]);

    return res.json({ message: 'CRM Connector removed successfully.' });
  } catch (err) {
    console.error('[crm-connectors DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
