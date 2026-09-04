/**
 * server/routes/appointments.js
 * Express router for /api/v1/appointments
 */

const express = require('express');
const router = express.Router();

const { get, query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

// GET /api/v1/appointments
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const leadId = req.query.lead_id;
    const status = req.query.status;

    let sql = `
      SELECT a.*, 
             l.name as lead_name, 
             l.email as lead_email, 
             l.phone as lead_phone, 
             l.company as lead_company,
             u.name as scheduled_by_name
      FROM appointments a
      JOIN leads l ON a.lead_id = l.id
      JOIN users u ON a.scheduled_by_user_id = u.id
      WHERE l.organization_id = ?
    `;
    const params = [session.organization_id];

    if (leadId) {
      sql += ` AND a.lead_id = ?`;
      params.push(leadId);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.start_time ASC`;

    const appointments = await query(sql, params);
    return res.json({ appointments });
  } catch (err) {
    console.error('[appointments GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/appointments
router.post('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { lead_id, start_time, end_time, notes } = req.body;

    if (!lead_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'lead_id, start_time, and end_time are required.' });
    }

    const lead = await get('SELECT id, current_crm_stage_id FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const apptId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO appointments (id, lead_id, scheduled_by_user_id, start_time, end_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [apptId, lead_id, session.id, start_time, end_time, notes || null]
    );

    const apptStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND (name LIKE \'%Appointment%\' OR name LIKE \'%Meeting%\') LIMIT 1', [session.organization_id]);
    if (apptStage) {
      await run("UPDATE leads SET current_crm_stage_id = ?, last_contacted_at = NOW(), updated_at = NOW() WHERE id = ?", [apptStage.id, lead_id]);
    }

    return res.status(201).json({
      message: 'Appointment scheduled successfully.',
      appointment_id: apptId
    });
  } catch (err) {
    console.error('[appointments POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/appointments/:id
router.put('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { status, notes, start_time, end_time } = req.body;

    const appt = await get(
      `SELECT a.* FROM appointments a JOIN leads l ON a.lead_id = l.id WHERE a.id = ? AND l.organization_id = ?`,
      [req.params.id, session.organization_id]
    );

    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    await run(
      `UPDATE appointments SET status = ?, notes = ?, start_time = ?, end_time = ?, updated_at = NOW() WHERE id = ?`,
      [status || appt.status, notes ?? appt.notes, start_time || appt.start_time, end_time || appt.end_time, req.params.id]
    );

    return res.json({ message: 'Appointment updated successfully.' });
  } catch (err) {
    console.error('[appointments PUT :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const appt = await get(
      `SELECT a.* FROM appointments a JOIN leads l ON a.lead_id = l.id WHERE a.id = ? AND l.organization_id = ?`,
      [req.params.id, session.organization_id]
    );

    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

    await run('DELETE FROM appointments WHERE id = ?', [req.params.id]);

    return res.json({ message: 'Appointment deleted successfully.' });
  } catch (err) {
    console.error('[appointments DELETE :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
