/**
 * server/routes/followup-templates.js
 * Express router for /api/v1/followup-templates
 */

const express = require('express');
const router = express.Router();

const { get, query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

// GET /api/v1/followup-templates
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const templates = await query(
      'SELECT * FROM follow_up_templates WHERE organization_id = ? ORDER BY created_at DESC',
      [session.organization_id]
    );

    return res.json({
      templates: templates.map(t => ({
        ...t,
        trigger_conditions: t.trigger_conditions ? JSON.parse(t.trigger_conditions) : {}
      }))
    });
  } catch (err) {
    console.error('[followup-templates GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/followup-templates
router.post('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { name, message_body, channel, trigger_conditions } = req.body;

    if (!name || !message_body) {
      return res.status(400).json({ error: 'name and message_body are required.' });
    }

    const templateId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO follow_up_templates (id, organization_id, name, message_body, channel, trigger_conditions, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        templateId,
        session.organization_id,
        name,
        message_body,
        channel || 'Email',
        JSON.stringify(trigger_conditions || {})
      ]
    );

    return res.status(201).json({
      message: 'Follow-up template created successfully.',
      template_id: templateId
    });
  } catch (err) {
    console.error('[followup-templates POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/followup-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { name, message_body, channel, trigger_conditions, is_active } = req.body;

    const tpl = await get('SELECT id FROM follow_up_templates WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });

    await run(
      `UPDATE follow_up_templates 
       SET name = COALESCE(?, name),
           message_body = COALESCE(?, message_body),
           channel = COALESCE(?, channel),
           trigger_conditions = COALESCE(?, trigger_conditions),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? null,
        message_body ?? null,
        channel ?? null,
        trigger_conditions ? JSON.stringify(trigger_conditions) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        req.params.id
      ]
    );

    return res.json({ message: 'Template updated successfully.' });
  } catch (err) {
    console.error('[followup-templates PUT :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/followup-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const tpl = await get('SELECT id FROM follow_up_templates WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!tpl) return res.status(404).json({ error: 'Template not found.' });

    await run('DELETE FROM follow_up_templates WHERE id = ?', [req.params.id]);

    return res.json({ message: 'Template deleted successfully.' });
  } catch (err) {
    console.error('[followup-templates DELETE :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
