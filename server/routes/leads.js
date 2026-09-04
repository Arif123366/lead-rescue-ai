/**
 * server/routes/leads.js
 * Express router for /api/v1/leads
 */

const express = require('express');
const router = express.Router();

const { get, query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { qualifyLead } = require('../../lib/ai/qualification');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

// GET /api/v1/leads
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const search = req.query.search || '';
    const status = req.query.status || '';
    const stageId = req.query.stage_id || '';
    const assignedUserId = req.query.assigned_user_id || '';
    const sourceId = req.query.source_id || '';

    let sql = `
      SELECT l.*, 
             ls.name as source_name, 
             cs.name as stage_name, 
             u.name as assigned_user_name,
             lqr.analysis_data
      FROM leads l
      LEFT JOIN lead_sources ls ON l.source_id = ls.id
      LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
      LEFT JOIN users u ON l.assigned_to_user_id = u.id
      LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
      WHERE l.organization_id = ?
    `;
    const params = [session.organization_id];

    if (search) {
      sql += ` AND (l.name LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (status) {
      sql += ` AND l.qualification_status = ?`;
      params.push(status);
    }
    if (stageId) {
      sql += ` AND l.current_crm_stage_id = ?`;
      params.push(stageId);
    }
    if (assignedUserId) {
      sql += ` AND l.assigned_to_user_id = ?`;
      params.push(assignedUserId);
    }
    if (sourceId) {
      sql += ` AND l.source_id = ?`;
      params.push(sourceId);
    }

    sql += ` ORDER BY l.created_at DESC`;

    const leads = await query(sql, params);

    return res.json({
      leads: leads.map(l => ({
        ...l,
        analysis_data: l.analysis_data ? JSON.parse(l.analysis_data) : null
      }))
    });
  } catch (err) {
    console.error('[leads GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/leads
router.post('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email, phone, company, product_interest, source_id, assigned_to_user_id, deal_value } = req.body;

    const orgInfo = await get(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [session.organization_id]
    );

    if (orgInfo && orgInfo.actual_leads >= orgInfo.lead_limit) {
      return res.status(400).json({
        error: `Organization lead limit of ${orgInfo.lead_limit} reached. Please upgrade your subscription plan to add more leads.`
      });
    }

    let finalSourceId = source_id;
    if (!finalSourceId) {
      const manualSource = await get('SELECT id FROM lead_sources WHERE organization_id = ? AND type = \'Manual\' LIMIT 1', [session.organization_id])
        || await get('SELECT id FROM lead_sources WHERE organization_id = ? LIMIT 1', [session.organization_id]);
      finalSourceId = manualSource?.id;
    }

    if (!finalSourceId) {
      finalSourceId = cryptoNativeOrRandomUUID();
      await run(
        `INSERT INTO lead_sources (id, organization_id, name, type, configuration) VALUES (?, ?, 'Manual Entry', 'Manual', '{}')`,
        [finalSourceId, session.organization_id]
      );
    }

    const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [session.organization_id])
      || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [session.organization_id]);

    if (!initialStage) {
      return res.status(500).json({ error: 'No CRM stage found for organization.' });
    }

    const leadId = cryptoNativeOrRandomUUID();

    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, assigned_to_user_id, deal_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, ?, NOW(), NOW())`,
      [
        leadId,
        session.organization_id,
        name || 'Unnamed Lead',
        email || null,
        phone || null,
        company || null,
        product_interest || null,
        finalSourceId,
        initialStage.id,
        assigned_to_user_id || null,
        deal_value || null
      ]
    );

    await run('UPDATE organizations SET current_lead_count = current_lead_count + 1 WHERE id = ?', [session.organization_id]);

    const sourceObj = await get('SELECT name FROM lead_sources WHERE id = ?', [finalSourceId]);
    
    qualifyLead({
      leadId,
      name,
      email,
      phone,
      company,
      product_interest,
      source_name: sourceObj?.name || 'Manual Entry'
    }).catch(err => console.error('Error during AI qualification:', err));

    return res.status(201).json({
      message: 'Lead created successfully and AI qualification initiated.',
      lead_id: leadId
    });
  } catch (err) {
    console.error('[leads POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/leads/import
router.post('/import', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid lead rows provided for import.' });
    }

    const orgInfo = await get(
      `SELECT o.id, sp.lead_limit, (SELECT COUNT(*) FROM leads WHERE organization_id = o.id) as actual_leads
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [session.organization_id]
    );

    const availableSlots = orgInfo ? Math.max(0, orgInfo.lead_limit - orgInfo.actual_leads) : rows.length;

    if (availableSlots <= 0) {
      return res.status(400).json({
        error: `Lead limit of ${orgInfo.lead_limit} reached. Cannot import more leads. Upgrade subscription plan.`
      });
    }

    const rowsToImport = rows.slice(0, availableSlots);

    let manualSource = await get('SELECT id FROM lead_sources WHERE organization_id = ? AND type = \'Manual\' LIMIT 1', [session.organization_id]);
    if (!manualSource) {
      const sourceId = cryptoNativeOrRandomUUID();
      await run(
        `INSERT INTO lead_sources (id, organization_id, name, type, configuration) VALUES (?, ?, 'CSV Upload', 'Manual', '{}')`,
        [sourceId, session.organization_id]
      );
      manualSource = { id: sourceId };
    }

    const initialStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_initial = 1 LIMIT 1', [session.organization_id])
      || await get('SELECT id FROM crm_stages WHERE organization_id = ? ORDER BY order_index ASC LIMIT 1', [session.organization_id]);

    let importedCount = 0;
    const leadIdsToQualify = [];

    for (const row of rowsToImport) {
      const leadId = cryptoNativeOrRandomUUID();
      const name = row.name || row.Name || row['Full Name'] || 'Imported Lead';
      const email = row.email || row.Email || null;
      const phone = row.phone || row.Phone || null;
      const company = row.company || row.Company || null;
      const product_interest = row.product_interest || row['Product Interest'] || row.Interest || null;
      const deal_value = parseFloat(row.deal_value || row['Deal Value'] || row.Value || '0') || null;

      await run(
        `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, qualification_score, qualification_status, current_crm_stage_id, deal_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending', ?, ?, NOW(), NOW())`,
        [leadId, session.organization_id, name, email, phone, company, product_interest, manualSource.id, initialStage.id, deal_value]
      );

      importedCount++;
      leadIdsToQualify.push({ id: leadId, name, email, phone, company, product_interest });
    }

    await run('UPDATE organizations SET current_lead_count = current_lead_count + ? WHERE id = ?', [importedCount, session.organization_id]);

    // Controlled batch processing for AI qualification to avoid rate limits
    (async () => {
      const BATCH_SIZE = 3;
      for (let i = 0; i < leadIdsToQualify.length; i += BATCH_SIZE) {
        const batch = leadIdsToQualify.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((item) =>
            qualifyLead({
              leadId: item.id,
              name: item.name,
              email: item.email,
              phone: item.phone,
              company: item.company,
              product_interest: item.product_interest,
              source_name: 'CSV Upload',
            }).catch((err) => console.error(`[csv import] AI qualification error for lead ${item.id}:`, err))
          )
        );
      }
    })().catch((err) => console.error('[csv import batch runner] Error:', err));

    return res.json({
      message: `Successfully imported ${importedCount} leads. AI qualification in progress.`,
      imported_count: importedCount,
      skipped_count: rows.length - importedCount
    });
  } catch (err) {
    console.error('[leads import]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const lead = await get(
      `SELECT l.*, 
              ls.name as source_name, 
              cs.name as stage_name, 
              u.name as assigned_user_name,
              lqr.analysis_data,
              lqr.ai_model_used,
              lqr.processed_at as qualified_at
       FROM leads l
       LEFT JOIN lead_sources ls ON l.source_id = ls.id
       LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
       LEFT JOIN users u ON l.assigned_to_user_id = u.id
       LEFT JOIN lead_qualification_results lqr ON l.id = lqr.lead_id
       WHERE l.id = ? AND l.organization_id = ?`,
      [req.params.id, session.organization_id]
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const followUpHistory = await query(
      'SELECT * FROM follow_up_messages WHERE lead_id = ? ORDER BY sent_at DESC',
      [req.params.id]
    );

    const appointments = await query(
      `SELECT a.*, u.name as scheduled_by_name FROM appointments a JOIN users u ON a.scheduled_by_user_id = u.id WHERE a.lead_id = ? ORDER BY a.start_time DESC`,
      [req.params.id]
    );

    return res.json({
      lead: {
        ...lead,
        analysis_data: lead.analysis_data ? JSON.parse(lead.analysis_data) : null
      },
      follow_up_history: followUpHistory,
      appointments
    });
  } catch (err) {
    console.error('[leads GET :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body;
    const existingLead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!existingLead) return res.status(404).json({ error: 'Lead not found.' });

    await run(
      `UPDATE leads
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           company = COALESCE(?, company),
           product_interest = COALESCE(?, product_interest),
           assigned_to_user_id = COALESCE(?, assigned_to_user_id),
           deal_value = COALESCE(?, deal_value),
           notes = COALESCE(?, notes),
           updated_at = NOW()
       WHERE id = ?`,
      [
        body.name ?? null,
        body.email ?? null,
        body.phone ?? null,
        body.company ?? null,
        body.product_interest ?? null,
        body.assigned_to_user_id ?? null,
        body.deal_value ?? null,
        body.notes ?? null,
        req.params.id
      ]
    );

    return res.json({ message: 'Lead updated successfully.' });
  } catch (err) {
    console.error('[leads PUT :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const existingLead = await get('SELECT id FROM leads WHERE id = ? AND organization_id = ?', [req.params.id, session.organization_id]);
    if (!existingLead) return res.status(404).json({ error: 'Lead not found.' });

    await run('DELETE FROM leads WHERE id = ?', [req.params.id]);

    return res.json({ message: 'Lead deleted successfully.' });
  } catch (err) {
    console.error('[leads DELETE :id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/leads/:id/qualify
router.post('/:id/qualify', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const lead = await get(
      `SELECT l.*, s.name as source_name 
       FROM leads l 
       LEFT JOIN lead_sources s ON l.source_id = s.id 
       WHERE l.id = ? AND l.organization_id = ?`,
      [req.params.id, session.organization_id]
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const result = await qualifyLead({
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      product_interest: lead.product_interest,
      source_name: lead.source_name
    });

    return res.json({
      message: 'Lead re-qualified successfully.',
      result
    });
  } catch (err) {
    console.error('[leads qualify]', err);
    return res.status(500).json({ error: err.message || 'Error qualifying lead' });
  }
});

module.exports = router;
