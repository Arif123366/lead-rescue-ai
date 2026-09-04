/**
 * server/routes/lead-sources.js
 * Express router for /api/v1/lead-sources
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { query, get, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');

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
        const parsedConfig = s.configuration ? JSON.parse(s.configuration) : {};
        return {
          ...s,
          configuration: {
            webhook_url: `/api/v1/webhooks/lead-source/${s.id}`,
            ...parsedConfig
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

    const { name, type, configuration } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required.' });
    }

    const sourceId = crypto.randomUUID();
    const webhookUrl = `/api/v1/webhooks/lead-source/${sourceId}`;

    const finalConfig = {
      webhook_url: webhookUrl,
      ...(configuration || {})
    };

    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
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
      webhook_url: webhookUrl
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

    const { name, type, configuration, is_active } = req.body;

    const src = await get('SELECT id FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!src) return res.status(404).json({ error: 'Lead source not found.' });

    await run(
      `UPDATE lead_sources 
       SET name = COALESCE(?, name),
           type = COALESCE(?, type),
           configuration = COALESCE(?, configuration),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? null,
        type ?? null,
        configuration ? JSON.stringify(configuration) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        req.params.id
      ]
    );

    return res.json({ message: 'Lead source updated successfully.' });
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

    const src = await get('SELECT id FROM lead_sources WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!src) return res.status(404).json({ error: 'Lead source not found.' });

    await run('DELETE FROM lead_sources WHERE id = ?', [req.params.id]);

    return res.json({ message: 'Lead source deleted successfully.' });
  } catch (err) {
    console.error('[lead-sources DELETE :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
