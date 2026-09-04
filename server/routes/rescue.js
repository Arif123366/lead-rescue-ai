/**
 * server/routes/rescue.js
 * Express router for /api/v1/rescue
 */

const express = require('express');
const router = express.Router();

const { get, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { runLeadRescueScan } = require('../../lib/ai/rescue');
const { sendFollowUp } = require('../../lib/ai/followup');

// GET /api/v1/rescue/scan
router.get('/scan', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const hoursThreshold = parseInt(req.query.hours || '48', 10);
    const atRiskLeads = await runLeadRescueScan(session.organization_id, hoursThreshold);
    const totalRescuableValue = atRiskLeads.reduce((acc, l) => acc + (parseFloat(l.deal_value) || 0), 0);

    return res.json({
      at_risk_leads: atRiskLeads,
      total_count: atRiskLeads.length,
      total_rescuable_value: totalRescuableValue,
      threshold_hours: hoursThreshold
    });
  } catch (err) {
    console.error('[rescue/scan]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/rescue/action
router.post('/action', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { lead_id, action_type, custom_message, template_id, new_user_id } = req.body;

    if (!lead_id || !action_type) {
      return res.status(400).json({ error: 'lead_id and action_type are required.' });
    }

    const lead = await get('SELECT * FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    let resultMessage = '';

    if (action_type === 'send_followup') {
      const resMsg = await sendFollowUp({
        leadId: lead_id,
        templateId: template_id,
        customMessage: custom_message || `Hi ${lead.name}, I wanted to re-connect regarding your interest in ${lead.product_interest || 'our solutions'}. Do you have 5 minutes for a quick update call?`
      });
      resultMessage = `Follow-up sent via ${resMsg.channel}.`;
    } else if (action_type === 'reassign') {
      const targetUserId = new_user_id || session.id;
      await run("UPDATE leads SET assigned_to_user_id = ?, updated_at = NOW() WHERE id = ?", [targetUserId, lead_id]);
      resultMessage = 'Lead reassigned successfully.';
    } else if (action_type === 'mark_contacted') {
      await run("UPDATE leads SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = ?", [lead_id]);
      resultMessage = 'Lead last contacted timestamp updated.';
    }

    await run("UPDATE notifications SET is_read = 1 WHERE related_entity_id = ? AND type = 'LEAD_RESCUE_ALERT'", [lead_id]);

    return res.json({
      message: 'Lead rescue action executed successfully.',
      result_summary: resultMessage
    });
  } catch (err) {
    console.error('[rescue/action]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
