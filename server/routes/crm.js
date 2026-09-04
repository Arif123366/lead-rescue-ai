/**
 * server/routes/crm.js
 * Express router for /api/v1/crm
 */

const express = require('express');
const router = express.Router();

const { get, query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

// GET /api/v1/crm/pipeline
router.get('/pipeline', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const stages = await query(
      'SELECT * FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC',
      [session.organization_id]
    );

    const leads = await query(
      `SELECT l.*, 
              ls.name as source_name, 
              u.name as assigned_user_name,
              lqr.analysis_data
       FROM leads l
       LEFT JOIN lead_sources ls ON l.source_id = ls.id
       LEFT JOIN users u ON l.assigned_to_user_id = u.id
       LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
       WHERE l.organization_id = ?
       ORDER BY l.created_at DESC`,
      [session.organization_id]
    );

    const pipeline = stages.map(stage => {
      const stageLeads = leads
        .filter(l => l.current_crm_stage_id === stage.id)
        .map(l => ({
          ...l,
          analysis_data: l.analysis_data ? JSON.parse(l.analysis_data) : null
        }));

      const totalValue = stageLeads.reduce((acc, l) => acc + (parseFloat(l.deal_value) || 0), 0);

      return {
        stage,
        leads: stageLeads,
        count: stageLeads.length,
        total_value: totalValue
      };
    });

    return res.json({ pipeline });
  } catch (err) {
    console.error('[crm/pipeline]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/crm/stages
router.get('/stages', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const stages = await query(
      'SELECT * FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC',
      [session.organization_id]
    );

    return res.json({ stages });
  } catch (err) {
    console.error('[crm/stages GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/crm/stages
router.post('/stages', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can add or edit CRM stages.' });
    }

    const { name, is_final_won, is_final_lost } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Stage name is required.' });
    }

    const countObj = await get('SELECT COUNT(*) as count FROM crm_stages WHERE organization_id = ?', [session.organization_id]);
    const existingCount = parseInt(countObj?.count || 0, 10);
    const newOrderIndex = existingCount + 1;

    const stageId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO crm_stages (id, organization_id, name, order_index, is_initial, is_final_won, is_final_lost)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [stageId, session.organization_id, name.trim(), newOrderIndex, is_final_won ? 1 : 0, is_final_lost ? 1 : 0]
    );

    return res.json({
      message: 'Stage created successfully.',
      stage: {
        id: stageId,
        name: name.trim(),
        order_index: newOrderIndex,
        is_initial: 0,
        is_final_won: is_final_won ? 1 : 0,
        is_final_lost: is_final_lost ? 1 : 0
      }
    });
  } catch (err) {
    console.error('[crm/stages POST]', err);
    return res.status(400).json({ error: err.message || 'Stage already exists' });
  }
});

// PUT /api/v1/crm/stages
router.put('/stages', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can modify CRM stages.' });
    }

    const { stages } = req.body;
    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'stages array expected.' });
    }

    for (const stg of stages) {
      await run(
        `UPDATE crm_stages SET name = ?, order_index = ?, is_final_won = ?, is_final_lost = ?, updated_at = NOW() WHERE id = ? AND organization_id = ?`,
        [stg.name, stg.order_index, stg.is_final_won ? 1 : 0, stg.is_final_lost ? 1 : 0, stg.id, session.organization_id]
      );
    }

    return res.json({ message: 'CRM stages updated successfully.' });
  } catch (err) {
    console.error('[crm/stages PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/crm/stages
router.delete('/stages', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can delete CRM stages.' });
    }

    const stageId = req.query.id;
    if (!stageId) return res.status(400).json({ error: 'Stage ID required.' });

    const leadsInStage = await get('SELECT COUNT(*) as count FROM leads WHERE current_crm_stage_id = ?', [stageId]);
    if (leadsInStage && parseInt(leadsInStage.count, 10) > 0) {
      return res.status(400).json({
        error: `Cannot delete stage because there are ${leadsInStage.count} leads currently in it. Move those leads to another stage first.`
      });
    }

    await run('DELETE FROM crm_stages WHERE id = ? AND organization_id = ?', [stageId, session.organization_id]);

    return res.json({ message: 'Stage deleted successfully.' });
  } catch (err) {
    console.error('[crm/stages DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/crm/move
router.post('/move', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { lead_id, target_stage_id, deal_value, reason_for_loss } = req.body;

    if (!lead_id || !target_stage_id) {
      return res.status(400).json({ error: 'lead_id and target_stage_id are required.' });
    }

    const lead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [lead_id, session.organization_id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const stage = await get('SELECT * FROM crm_stages WHERE id = ? AND organization_id = ?', [target_stage_id, session.organization_id]);
    if (!stage) return res.status(404).json({ error: 'CRM stage not found.' });

    await run(
      `UPDATE leads 
       SET current_crm_stage_id = ?, 
           deal_value = COALESCE(?, deal_value), 
           reason_for_loss = COALESCE(?, reason_for_loss),
           updated_at = NOW()
       WHERE id = ?`,
      [target_stage_id, deal_value ?? null, reason_for_loss ?? null, lead_id]
    );

    return res.json({
      message: 'Lead stage moved successfully.',
      lead_id,
      new_stage: stage.name
    });
  } catch (err) {
    console.error('[crm/move]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
