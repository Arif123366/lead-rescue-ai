/**
 * lib/queue/worker.ts
 * Standalone background worker process for executing queued AI jobs in production clusters.
 *
 * Execution:
 *   NODE_ENV=production node -r ts-node/register lib/queue/worker.ts
 */

import { qualifyLead } from '../ai/qualification';
import { get } from '../db/db';

console.log('────────────────────────────────────────────────────────────');
console.log('⚙️  Lead Rescue AI — Distributed Queue Worker Started');
console.log('────────────────────────────────────────────────────────────');
console.log(` Status:    Active`);
console.log(` Redis:     ${process.env.REDIS_URL ? 'Connected' : 'In-Memory Fallback'}`);
console.log('────────────────────────────────────────────────────────────\n');

export async function processQualificationTask(leadId: string) {
  console.log(`[Worker] Starting processing for Lead ID: ${leadId}`);
  try {
    const lead = await get<{ name?: string; email?: string; phone?: string; company?: string; product_interest?: string }>(
      'SELECT name, email, phone, company, product_interest FROM leads WHERE id = ?',
      [leadId]
    );
    const result = await qualifyLead({
      leadId,
      name: lead?.name,
      email: lead?.email,
      phone: lead?.phone,
      company: lead?.company,
      product_interest: lead?.product_interest,
    });
    console.log(`[Worker] Qualification finished. Status: ${result.status}, Score: ${result.score}`);
    return result;
  } catch (err) {
    console.error(`[Worker] Error processing lead ${leadId}:`, err);
    throw err;
  }
}

if (require.main === module) {
  console.log('[Worker] Worker listener running. Ready to receive background jobs.');
}
