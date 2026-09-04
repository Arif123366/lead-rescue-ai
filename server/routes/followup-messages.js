/**
 * server/routes/followup-messages.js
 * Express router for /api/v1/followup-messages
 */

const express = require('express');
const router = express.Router();

const { getCurrentUser } = require('../../lib/auth/auth');
const { sendFollowUp, processInboundResponse } = require('../../lib/ai/followup');

// POST /api/v1/followup-messages/send
router.post('/send', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { lead_id, template_id, custom_message, channel } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id is required.' });
    }

    const result = await sendFollowUp({
      leadId: lead_id,
      templateId: template_id,
      customMessage: custom_message,
      channel
    });

    return res.json({
      message: 'Follow-up message sent successfully.',
      result
    });
  } catch (err) {
    console.error('[followup-messages/send]', err);
    return res.status(400).json({ error: err.message || 'Error sending follow-up message' });
  }
});

// POST /api/v1/followup-messages/response
router.post('/response', async (req, res) => {
  try {
    const { lead_id, response_content } = req.body;

    if (!lead_id || !response_content) {
      return res.status(400).json({ error: 'lead_id and response_content are required.' });
    }

    await processInboundResponse(lead_id, response_content);

    return res.json({ message: 'Inbound response processed successfully.' });
  } catch (err) {
    console.error('[followup-messages/response]', err);
    return res.status(500).json({ error: err.message || 'Error processing response' });
  }
});

module.exports = router;
