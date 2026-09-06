/**
 * server/lib/queue/asyncQueue.js
 * In-memory background job queue with concurrency control, exponential backoff retries, and error handling.
 * Decouples webhook ingestion and lead creation from heavy LLM operations (Gemini / AI qualification).
 */

const path = require('path');
const { qualifyLead } = require(path.resolve(__dirname, '../../../lib/ai/qualification'));

class AsyncQueue {
  constructor(concurrency = 3, maxRetries = 3) {
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
    this.queue = [];
    this.activeWorkers = 0;
    this.jobs = new Map();
  }

  /**
   * Enqueues a task for background processing.
   * @param {string} taskType - Type of task (e.g. 'QUALIFY_LEAD')
   * @param {Object} payload - Data required for the task
   * @param {Object} [options] - Additional task options
   * @returns {string} jobId
   */
  enqueue(taskType, payload, options = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job = {
      id: jobId,
      taskType,
      payload,
      options,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      error: null
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    // Trigger queue processing asynchronously
    setImmediate(() => this.processNext());

    return jobId;
  }

  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') return;

    this.activeWorkers += 1;
    job.status = 'processing';
    job.attempts += 1;
    job.updatedAt = new Date();

    try {
      await this.executeTask(job);
      job.status = 'completed';
      job.updatedAt = new Date();
    } catch (err) {
      console.error(`[AsyncQueue] Task ${job.taskType} (ID: ${job.id}) failed (Attempt ${job.attempts}/${this.maxRetries}):`, err.message);
      job.error = err.message;

      if (job.attempts < this.maxRetries) {
        job.status = 'retry';
        // Exponential backoff delay: 2s, 4s, 8s... (or job.options.backoffMs if specified)
        const backoffMs = (job.options && job.options.backoffMs !== undefined) ? job.options.backoffMs : Math.pow(2, job.attempts) * 1000;
        setTimeout(() => {
          job.status = 'pending';
          this.queue.push(job.id);
          this.processNext();
        }, backoffMs);
      } else {
        job.status = 'failed';
        job.updatedAt = new Date();
      }
    } finally {
      this.activeWorkers -= 1;
      this.processNext();
    }
  }

  async executeTask(job) {
    switch (job.taskType) {
      case 'QUALIFY_LEAD':
        return await qualifyLead(job.payload);
      default:
        throw new Error(`Unknown task type: ${job.taskType}`);
    }
  }

  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }
}

// Singleton queue instance
const leadQueue = new AsyncQueue(3, 3);

module.exports = {
  AsyncQueue,
  leadQueue
};
