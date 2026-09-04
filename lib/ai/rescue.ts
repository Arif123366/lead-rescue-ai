import { query, get, run } from '../db/db';
import { cryptoNativeOrRandomUUID } from '../utils/uuid';

export interface RescueAlertItem {
  lead_id: string;
  lead_name: string;
  company: string;
  email: string;
  phone: string;
  product_interest: string;
  qualification_score: number;
  qualification_status: string;
  deal_value: number;
  last_contacted_at: string;
  hours_idle: number;
  assigned_to_name: string;
  assigned_to_user_id: string;
  recommended_action: string;
  recommended_template_id?: string;
}

export async function runLeadRescueScan(organizationId: string, hoursThreshold: number = 48): Promise<RescueAlertItem[]> {
  const cutoffDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

  const leads = await query<any>(
    `SELECT l.*, u.name as assigned_to_name, s.name as source_name
     FROM leads l
     LEFT JOIN users u ON l.assigned_to_user_id = u.id
     LEFT JOIN lead_sources s ON l.source_id = s.id
     WHERE l.organization_id = ?
       AND l.qualification_status IN ('Hot', 'Warm')
       AND (l.last_contacted_at IS NULL OR l.last_contacted_at <= ?)
       AND l.opt_out_communications = 0
     ORDER BY l.deal_value DESC, l.qualification_score DESC`,
    [organizationId, cutoffDate]
  );

  const defaultTemplate = await get<any>(
    `SELECT id FROM follow_up_templates WHERE organization_id = ? AND is_active = 1 LIMIT 1`,
    [organizationId]
  );

  const results: RescueAlertItem[] = leads.map(l => {
    const lastContactTime = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : new Date(l.created_at).getTime();
    const hoursIdle = Math.round((Date.now() - lastContactTime) / (1000 * 60 * 60));

    let recommendedAction = 'Send automated AI follow-up message';
    if (hoursIdle > 96) {
      recommendedAction = 'Schedule priority call & update stage to Urgent Follow-Up';
    } else if (l.deal_value && l.deal_value > 50000) {
      recommendedAction = 'Direct executive outreach / Schedule high-value demo';
    }

    return {
      lead_id: l.id,
      lead_name: l.name || 'Unnamed Lead',
      company: l.company || 'N/A',
      email: l.email || '',
      phone: l.phone || '',
      product_interest: l.product_interest || 'General Inquiry',
      qualification_score: l.qualification_score,
      qualification_status: l.qualification_status,
      deal_value: l.deal_value || 0,
      last_contacted_at: l.last_contacted_at || l.created_at,
      hours_idle: hoursIdle,
      assigned_to_name: l.assigned_to_name || 'Unassigned',
      assigned_to_user_id: l.assigned_to_user_id,
      recommended_action: recommendedAction,
      recommended_template_id: defaultTemplate?.id
    };
  });

  for (const item of results) {
    const existingNotif = await get(
      `SELECT id FROM notifications WHERE related_entity_id = ? AND type = 'LEAD_RESCUE_ALERT' AND is_read = 0`,
      [item.lead_id]
    );

    if (!existingNotif) {
      const ownerObj = await get<{ owner_user_id: string }>('SELECT owner_user_id FROM organizations WHERE id = ?', [organizationId]);
      const targetUserId = item.assigned_to_user_id || ownerObj?.owner_user_id;

      if (targetUserId) {
        await run(
          `INSERT INTO notifications (id, user_id, organization_id, type, message, related_entity_id, related_entity_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            cryptoNativeOrRandomUUID(),
            targetUserId,
            organizationId,
            'LEAD_RESCUE_ALERT',
            `🚨 LEAD RESCUE ALERT: ${item.qualification_status} lead ${item.lead_name} (${item.company}) has been idle for ${item.hours_idle} hours! Value: $${item.deal_value.toLocaleString()}`,
            item.lead_id,
            'Lead'
          ]
        );
      }
    }
  }

  return results;
}
