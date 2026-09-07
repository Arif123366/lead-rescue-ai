/**
 * server/routes/reports.js
 * Express router for /api/v1/reports
 */

const express = require('express');
const router = express.Router();

const { get, query } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { runLeadRescueScan } = require('../../lib/ai/rescue');

// GET /api/v1/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const orgId = session.organization_id;

    const totalLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [orgId]);
    const totalLeads = parseInt(totalLeadsObj?.count || 0, 10);

    const hotLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Hot\'', [orgId]);
    const warmLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Warm\'', [orgId]);
    const coldLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Cold\'', [orgId]);

    const pipelineValueObj = await get('SELECT SUM(COALESCE(deal_value, 0)) as total FROM leads WHERE organization_id = ?', [orgId]);
    const totalPipelineValue = parseFloat(pipelineValueObj?.total || 0);

    // Conversion rate: Won Leads / Qualified Leads (Hot + Warm)
    const wonLeadsObj = await get(
      `SELECT COUNT(*) as count FROM leads l
       JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
       WHERE l.organization_id = ? AND cs.is_final_won = 1`,
      [orgId]
    );
    const wonCount = parseInt(wonLeadsObj?.count || 0, 10);
    const qualifiedCount = parseInt(hotLeadsObj?.count || 0, 10) + parseInt(warmLeadsObj?.count || 0, 10);
    const conversionRate = qualifiedCount > 0 ? ((wonCount / qualifiedCount) * 100).toFixed(1) : '0.0';

    // AI Follow-ups Sent count
    const followupsObj = await get(
      `SELECT COUNT(*) as count FROM follow_up_messages fm
       JOIN leads l ON fm.lead_id = l.id
       WHERE l.organization_id = ?`,
      [orgId]
    );
    const followupsSent = parseInt(followupsObj?.count || 0, 10);

    // Appointments Scheduled count
    const appointmentsObj = await get(
      `SELECT COUNT(*) as count FROM appointments a
       JOIN leads l ON a.lead_id = l.id
       WHERE l.organization_id = ?`,
      [orgId]
    );
    const appointmentsScheduled = parseInt(appointmentsObj?.count || 0, 10);

    // At-Risk Leads Needing Attention (Lead Rescue Command)
    let atRiskLeads = [];
    try {
      atRiskLeads = await runLeadRescueScan(orgId, 48);
    } catch (e) {
      console.warn('[reports/dashboard] runLeadRescueScan error:', e.message);
    }

    const stageVelocity = await query(
      `SELECT cs.id as stage_id, cs.name as stage_name, COUNT(l.id) as lead_count, SUM(COALESCE(l.deal_value, 0)) as total_value
       FROM crm_stages cs
       LEFT JOIN leads l ON cs.id = l.current_crm_stage_id
       WHERE cs.organization_id = ?
       GROUP BY cs.id, cs.name, cs.order_index
       ORDER BY cs.order_index ASC`,
      [orgId]
    );

    const recentLeads = await query(
      `SELECT l.id, l.name, l.company, l.qualification_score, l.qualification_status, l.created_at, cs.name as stage_name
       FROM leads l
       LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
       WHERE l.organization_id = ?
       ORDER BY l.created_at DESC
       LIMIT 5`,
      [orgId]
    );

    return res.json({
      metrics: {
        total_leads: totalLeads,
        hot_leads: parseInt(hotLeadsObj?.count || 0, 10),
        warm_leads: parseInt(warmLeadsObj?.count || 0, 10),
        cold_leads: parseInt(coldLeadsObj?.count || 0, 10),
        pipeline_value: totalPipelineValue,
        total_pipeline_value: totalPipelineValue,
        conversion_rate: conversionRate,
        ai_followups_sent: followupsSent,
        appointments_scheduled: appointmentsScheduled,
        leads_needing_attention: atRiskLeads.length
      },
      needs_attention: atRiskLeads.slice(0, 5),
      stage_velocity: stageVelocity,
      stage_breakdown: stageVelocity,
      recent_leads: recentLeads
    });
  } catch (err) {
    console.error('[reports/dashboard]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/lead-sources
router.get('/lead-sources', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const from = req.query.from;
    const to = req.query.to;

    let dateFilter = '';
    const params = [session.organization_id];

    if (from) {
      dateFilter += ' AND l.created_at >= ?';
      params.push(from);
    }
    if (to) {
      dateFilter += ' AND l.created_at <= ?';
      params.push(to);
    }

    const sql = `
      SELECT 
         ls.id as source_id,
         ls.name as source_name,
         ls.type as source_type,
         COUNT(l.id) as total_leads,
         SUM(CASE WHEN l.qualification_status = 'Hot' THEN 1 ELSE 0 END) as hot_leads,
         SUM(CASE WHEN l.qualification_status = 'Warm' THEN 1 ELSE 0 END) as warm_leads,
         AVG(COALESCE(l.qualification_score, 0)) as avg_qualification_score,
         SUM(COALESCE(l.deal_value, 0)) as total_deal_value
       FROM lead_sources ls
       LEFT JOIN leads l ON ls.id = l.source_id ${dateFilter}
       WHERE ls.organization_id = ?
       GROUP BY ls.id, ls.name, ls.type
       ORDER BY total_leads DESC`;

    const sourcesPerformance = await query(sql, params);

    return res.json({
      sources_performance: sourcesPerformance.map((s) => ({
        ...s,
        avg_qualification_score: Math.round((parseFloat(s.avg_qualification_score) || 0) * 10) / 10,
      })),
    });
  } catch (err) {
    console.error('[reports/lead-sources]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/reports/sales-team
router.get('/sales-team', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const from = req.query.from;
    const to = req.query.to;

    let dateFilter = '';
    const params = [session.organization_id];

    if (from) {
      dateFilter += ' AND l.created_at >= ?';
      params.push(from);
    }
    if (to) {
      dateFilter += ' AND l.created_at <= ?';
      params.push(to);
    }

    const sql = `
      SELECT 
         u.id as user_id,
         u.name as user_name,
         u.role,
         COUNT(l.id) as assigned_leads,
         SUM(CASE WHEN l.qualification_status = 'Hot' THEN 1 ELSE 0 END) as hot_leads_managed,
         SUM(COALESCE(l.deal_value, 0)) as total_pipeline_managed,
         SUM(CASE WHEN cs.is_final_won = 1 THEN 1 ELSE 0 END) as deals_won,
         SUM(CASE WHEN cs.is_final_won = 1 THEN COALESCE(l.deal_value, 0) ELSE 0 END) as revenue_closed
       FROM users u
       LEFT JOIN leads l ON u.id = l.assigned_to_user_id ${dateFilter}
       LEFT JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
       WHERE u.organization_id = ?
       GROUP BY u.id, u.name, u.role
       ORDER BY revenue_closed DESC, assigned_leads DESC`;

    const salesTeamPerformance = await query(sql, params);

    return res.json({ sales_team_performance: salesTeamPerformance });
  } catch (err) {
    console.error('[reports/sales-team]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
