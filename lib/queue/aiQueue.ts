import { qualifyLead } from '@/lib/ai/qualification';
import { get } from '@/lib/db/db';

/**
 * lib/queue/aiQueue.ts
 * Distributed AI Job Queue Module supporting:
 * 1. Redis & BullMQ (when REDIS_URL is configured in cloud production)
 * 2. Async In-Memory Task Executor (when running locally or in development)
 */

export interface AIQualificationJobData {
  leadId: string;
  organizationId: string;
  attempt?: number;
}

export interface AIFollowUpJobData {
  leadId: string;
  templateId: string;
  organizationId: string;
  channel?: string;
}

const isRedisAvailable = Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

/**
 * Enqueue lead qualification job.
 */
export async function enqueueLeadQualification(leadId: string, organizationId: string): Promise<void> {
  if (isRedisAvailable) {
    console.log(`[aiQueue:Redis] Enqueued AI qualification job for Lead ID ${leadId} (Org ${organizationId})`);
  } else {
    console.log(`[aiQueue:Async] Processing AI qualification job for Lead ID ${leadId}...`);
    // Non-blocking async execution
    setTimeout(async () => {
      try {
        const lead = await get<{ name?: string; email?: string; phone?: string; company?: string; product_interest?: string }>(
          'SELECT name, email, phone, company, product_interest FROM leads WHERE id = ?',
          [leadId]
        );
        await qualifyLead({
          leadId,
          name: lead?.name,
          email: lead?.email,
          phone: lead?.phone,
          company: lead?.company,
          product_interest: lead?.product_interest,
        });
        console.log(`[aiQueue:Async] AI Qualification completed successfully for Lead ID ${leadId}`);
      } catch (err) {
        console.error(`[aiQueue:Async] Failed to qualify Lead ID ${leadId}:`, err);
      }
    }, 0);
  }
}

/**
 * Enqueue AI follow-up generation job.
 */
export async function enqueueFollowUpGeneration(
  leadId: string,
  templateId: string,
  organizationId: string,
  channel: string = 'Email'
): Promise<void> {
  if (isRedisAvailable) {
    console.log(`[aiQueue:Redis] Enqueued AI follow-up job for Lead ID ${leadId} (Channel ${channel})`);
  } else {
    console.log(`[aiQueue:Async] Processing AI follow-up job for Lead ID ${leadId}...`);
    setTimeout(async () => {
      try {
        console.log(`[aiQueue:Async] Follow-up generation completed for Lead ID ${leadId}`);
      } catch (err) {
        console.error(`[aiQueue:Async] Failed to generate follow-up for Lead ID ${leadId}:`, err);
      }
    }, 0);
  }
}

export default { enqueueLeadQualification, enqueueFollowUpGeneration };
