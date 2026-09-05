import { get, run } from '../db/db';
import { sendFollowUpEmail } from '../email/mailer';
import { sendWhatsAppMessage } from '../twilio/whatsapp';

export interface ExecuteFollowUpInput {
  leadId: string;
  templateId?: string;
  customMessage?: string;
  channel?: 'Email' | 'WhatsApp';
}

export function interpolateTemplate(template: string, lead: Record<string, any>): string {
  let result = template;
  result = result.replace(/\{\{\s*lead\.name\s*\}\}/g, lead.name || 'there');
  result = result.replace(/\{\{\s*lead\.email\s*\}\}/g, lead.email || '');
  result = result.replace(/\{\{\s*lead\.phone\s*\}\}/g, lead.phone || '');
  result = result.replace(/\{\{\s*lead\.company\s*\}\}/g, lead.company || 'your organization');
  result = result.replace(/\{\{\s*lead\.product_interest\s*\}\}/g, lead.product_interest || 'our solutions');
  return result;
}

export async function sendFollowUp(input: ExecuteFollowUpInput) {
  const lead = await get<any>('SELECT * FROM leads WHERE id = ?', [input.leadId]);
  if (!lead) throw new Error('Lead not found');

  if (lead.opt_out_communications) {
    throw new Error('Lead has opted out of communications');
  }

  if (!lead.email && (!input.channel || input.channel === 'Email')) {
    throw new Error('Lead does not have an email address for email follow-up');
  }

  let templateContent = input.customMessage;
  let templateObj: any;

  if (input.templateId) {
    templateObj = await get<any>('SELECT * FROM follow_up_templates WHERE id = ?', [input.templateId]);
    if (templateObj) {
      templateContent = templateObj.message_body;
    }
  }

  if (!templateContent) {
    templateContent = `Hi {{lead.name}},\n\nI wanted to follow up on your interest in {{lead.product_interest}} for {{lead.company}}.\n\nWould you be available for a quick 15-minute call this week to discuss how we can help?\n\nLooking forward to hearing from you.`;
  }

  const finalMessage = interpolateTemplate(templateContent, lead);
  const channel: 'Email' | 'WhatsApp' = input.channel || (templateObj?.channel as 'Email' | 'WhatsApp') || 'Email';

  const messageId = crypto.randomUUID();

  // Record outbound message in DB
  await run(
    `INSERT INTO follow_up_messages (id, lead_id, template_id, sent_at, message, message_content, channel, status, direction, created_at)
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'Outbound', NOW())`,
    [messageId, input.leadId, input.templateId || null, finalMessage, finalMessage, channel, 'Pending']
  );

  let deliveryStatus = 'Sent';

  // Attempt actual delivery
  try {
    if (channel === 'Email' && lead.email) {
      // Fetch organization name for email footer
      const org = await get<{ name: string }>('SELECT name FROM organizations WHERE id = ?', [lead.organization_id]);

      await sendFollowUpEmail({
        to: lead.email,
        subject: `Following up on your interest in ${lead.product_interest || 'our services'}`,
        body: finalMessage,
        organizationName: org?.name || 'Lead Rescue AI',
      });
      deliveryStatus = 'Sent';
    } else if (channel === 'WhatsApp') {
      if (!lead.phone) {
        throw new Error('Lead does not have a phone number for WhatsApp follow-up');
      }
      const waRes = await sendWhatsAppMessage({
        to: lead.phone,
        message: finalMessage
      });
      deliveryStatus = waRes.success ? 'Sent' : 'Failed';
    }
  } catch (err) {
    console.error('[followup] Delivery failed:', err);
    deliveryStatus = 'Failed';
  }

  // Update delivery status
  await run(
    `UPDATE follow_up_messages SET status = ? WHERE id = ?`,
    [deliveryStatus, messageId]
  );

  // Update lead's last_contacted_at
  await run(
    `UPDATE leads SET last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [input.leadId]
  );

  // Mark related Lead Rescue Alerts as resolved
  await run(
    `UPDATE notifications SET is_read = 1 WHERE related_entity_id = ? AND type = 'LEAD_RESCUE_ALERT'`,
    [input.leadId]
  );

  return {
    id: messageId,
    leadId: input.leadId,
    message: finalMessage,
    channel,
    status: deliveryStatus,
    sent_at: new Date().toISOString(),
  };
}

export async function processInboundResponse(leadId: string, responseContent: string) {
  const lead = await get<any>('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead) return;

  const text = responseContent.toLowerCase();

  // Opt-out detection
  if (
    text.includes('stop') ||
    text.includes('unsubscribe') ||
    text.includes('remove me') ||
    text.includes('not interested') ||
    text.includes('opt out') ||
    text.includes('do not contact')
  ) {
    await run(
      `UPDATE leads SET opt_out_communications = 1, qualification_status = 'Cold', updated_at = datetime('now') WHERE id = ?`,
      [leadId]
    );
    return { action: 'opted_out' };
  }

  // Positive intent signals
  let scoreAdjustment = 0;
  let updatedStatus = lead.qualification_status;

  if (
    text.includes('yes') ||
    text.includes('interested') ||
    text.includes('call') ||
    text.includes('schedule') ||
    text.includes('demo') ||
    text.includes('pricing') ||
    text.includes('available') ||
    text.includes('when can') ||
    text.includes('book')
  ) {
    updatedStatus = 'Hot';
    scoreAdjustment = 20;
  } else if (
    text.includes('maybe') ||
    text.includes('consider') ||
    text.includes('send more') ||
    text.includes('tell me more')
  ) {
    if (lead.qualification_status === 'Cold') updatedStatus = 'Warm';
    scoreAdjustment = 8;
  }

  const newScore = Math.min(100, Math.max(0, (lead.qualification_score || 0) + scoreAdjustment));

  await run(
    `UPDATE leads SET qualification_score = ?, qualification_status = ?, last_contacted_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [newScore, updatedStatus, leadId]
  );

  // Log inbound response
  await run(
    `INSERT INTO follow_up_messages (id, lead_id, sent_at, message, channel, status, direction, created_at)
     VALUES (?, ?, NOW(), ?, 'Email', 'Received', 'Inbound', NOW())`,
    [crypto.randomUUID(), leadId, responseContent]
  );

  return { action: 'processed', newScore, newStatus: updatedStatus };
}
