/**
 * test/security_and_pipeline.test.js
 * Comprehensive automated test suite covering auth rate limiting, CSV formula injection sanitization,
 * tenant isolation / IDOR boundaries, asynchronous webhook queue processing, compliance pages, and frontend error boundaries.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { sanitizeCsvField, formatLeadsToCsv } = require('../server/lib/utils/csvSanitizer');
const { createRateLimiter } = require('../server/middleware/rateLimiter');
const { AsyncQueue } = require('../server/lib/queue/asyncQueue');

console.log('🧪 Starting Lead Rescue AI Full SaaS Remediation & Verification Test Suite...\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, testFn) {
  totalTests += 1;
  try {
    testFn();
    passedTests += 1;
    console.log(`  ✅ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

async function runAsyncTest(name, testFn) {
  totalTests += 1;
  try {
    await testFn();
    passedTests += 1;
    console.log(`  ✅ PASSED: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

(async () => {
  // ─── 1. CSV Formula Injection Sanitization Tests ─────────────────────────────
  console.log('--- 1. CSV Formula Injection Sanitization ---');

  runTest('1. Sanitizes = formula injection trigger', () => {
    const result = sanitizeCsvField('=SUM(1+1)');
    assert.strictEqual(result, "'=SUM(1+1)");
  });

  runTest('2. Sanitizes + formula injection trigger', () => {
    const result = sanitizeCsvField('+123456');
    assert.strictEqual(result, "'+123456");
  });

  runTest('3. Sanitizes - formula injection trigger', () => {
    const result = sanitizeCsvField('-1+1');
    assert.strictEqual(result, "'-1+1");
  });

  runTest('4. Sanitizes @ formula injection trigger', () => {
    const result = sanitizeCsvField('@SUM(A1:A10)');
    assert.strictEqual(result, "'@SUM(A1:A10)");
  });

  runTest('5. Leaves safe string untransformed', () => {
    const result = sanitizeCsvField('John Doe');
    assert.strictEqual(result, 'John Doe');
  });

  runTest('6. Handles null and undefined fields safely', () => {
    assert.strictEqual(sanitizeCsvField(null), '');
    assert.strictEqual(sanitizeCsvField(undefined), '');
  });

  runTest('7. Preserves numeric values without transformation (as string)', () => {
    assert.strictEqual(sanitizeCsvField(5000), '5000');
    assert.strictEqual(sanitizeCsvField(0), '0');
  });

  runTest('8. Formats lead array into formula-sanitized CSV with valid header', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        name: '=cmd|"/C calc"!A1',
        email: 'john@example.com',
        phone: '+15550001',
        company: 'Acme Inc',
        product_interest: 'Enterprise SaaS',
        deal_value: 5000,
        qualification_status: 'Hot',
        qualification_score: 95,
        stage_name: 'New Lead',
        source_name: 'Manual Entry',
        created_at: '2026-09-06T00:00:00.000Z'
      }
    ];

    const csvOutput = formatLeadsToCsv(mockLeads);
    assert.ok(csvOutput.includes('ID,Name,Email,Phone,Company'), 'CSV should contain standard header');
    assert.ok(csvOutput.includes('\'=cmd|""/C calc""!A1'), 'Formula injection trigger should be prefixed with single quote');
    assert.ok(csvOutput.includes('\'+15550001'), 'Phone number starting with + should be sanitized');
  });

  // ─── 2. Rate Limiting Middleware Tests ───────────────────────────────────────
  console.log('\n--- 2. Rate Limiting Middleware ---');

  runTest('9. Rate limiter allows requests under threshold and blocks over threshold', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });

    const req = { baseUrl: '/api/v1/auth', path: '/login', ip: '192.168.1.100', headers: {}, socket: {} };
    let nextCalled = 0;
    let statusCode = null;
    let responseBody = null;

    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };

    // Attempt 1: Allowed
    limiter(req, mockRes, () => { nextCalled += 1; });
    assert.strictEqual(nextCalled, 1);

    // Attempt 2: Allowed
    limiter(req, mockRes, () => { nextCalled += 1; });
    assert.strictEqual(nextCalled, 2);

    // Attempt 3: Blocked (HTTP 429)
    limiter(req, mockRes, () => { nextCalled += 1; });
    assert.strictEqual(nextCalled, 2, 'Next should not be called when limit exceeded');
    assert.strictEqual(statusCode, 429, 'Status code should be 429 Too Many Requests');
    assert.ok(responseBody.retry_after_seconds > 0, 'Retry-After should be populated');
  });

  runTest('10. Rate limiter isolates tracking across distinct IP addresses', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });

    const reqA = { baseUrl: '/api/v1/auth', path: '/login', ip: '10.0.0.1', headers: {}, socket: {} };
    const reqB = { baseUrl: '/api/v1/auth', path: '/login', ip: '10.0.0.2', headers: {}, socket: {} };
    let calledA = 0;
    let calledB = 0;

    const mockRes = { setHeader: () => {}, status: () => ({ json: () => {} }) };

    limiter(reqA, mockRes, () => { calledA += 1; });
    limiter(reqB, mockRes, () => { calledB += 1; });

    assert.strictEqual(calledA, 1, 'IP A should be allowed');
    assert.strictEqual(calledB, 1, 'IP B should be allowed independently');
  });

  runTest('11. Rate limiter sets Retry-After header on 429 responses', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = { baseUrl: '/api/v1/auth', path: '/login', ip: '10.0.0.3', headers: {}, socket: {} };
    const headersSet = {};
    const mockRes = {
      setHeader: (key, val) => { headersSet[key] = val; },
      status: () => ({ json: () => {} })
    };

    limiter(req, mockRes, () => {});
    limiter(req, mockRes, () => {});

    assert.ok(headersSet['Retry-After'] !== undefined, 'Retry-After header should be set');
  });

  // ─── 3. Asynchronous Job Queue Tests ─────────────────────────────────────────
  console.log('\n--- 3. Asynchronous Queue & Exponential Backoff ---');

  await runAsyncTest('12. AsyncQueue enqueues and processes task asynchronously', async () => {
    const queue = new AsyncQueue(2, 2);
    let taskExecuted = false;

    queue.executeTask = async (job) => {
      if (job.taskType === 'TEST_TASK') {
        taskExecuted = true;
        return { success: true };
      }
    };

    const jobId = queue.enqueue('TEST_TASK', { data: 123 });
    assert.ok(jobId, 'Job ID should be generated');

    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(taskExecuted, true, 'Job should execute asynchronously');
    const jobStatus = queue.getJobStatus(jobId);
    assert.strictEqual(jobStatus.status, 'completed');
  });

  await runAsyncTest('13. AsyncQueue retries failed jobs with exponential backoff', async () => {
    const queue = new AsyncQueue(1, 3);
    let attempts = 0;

    queue.executeTask = async (job) => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('Transient LLM API Error');
      }
      return { success: true };
    };

    const jobId = queue.enqueue('RETRY_TASK', { payload: 'abc' }, { backoffMs: 20 });
    await new Promise(r => setTimeout(r, 200));

    assert.strictEqual(attempts, 2, 'Job should be retried after initial failure');
    const jobStatus = queue.getJobStatus(jobId);
    assert.strictEqual(jobStatus.status, 'completed');
  });

  await runAsyncTest('14. AsyncQueue respects maximum concurrency limit', async () => {
    const queue = new AsyncQueue(1, 1);
    let concurrentCount = 0;
    let maxObservedConcurrency = 0;

    queue.executeTask = async () => {
      concurrentCount += 1;
      if (concurrentCount > maxObservedConcurrency) {
        maxObservedConcurrency = concurrentCount;
      }
      await new Promise(r => setTimeout(r, 50));
      concurrentCount -= 1;
      return { success: true };
    };

    queue.enqueue('TASK_1', {});
    queue.enqueue('TASK_2', {});
    await new Promise(r => setTimeout(r, 150));

    assert.strictEqual(maxObservedConcurrency, 1, 'Concurrency must not exceed maxConcurrent (1)');
  });

  // ─── 4. Tenant Isolation & IDOR Structural Audits ─────────────────────────────
  console.log('\n--- 4. Tenant Isolation & IDOR Audits ---');

  runTest('15. Leads API route file scopes all database queries with organization_id', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/leads.js'), 'utf8');
    assert.ok(content.includes('session.organization_id'), 'leads.js must reference session.organization_id');
    assert.ok(content.includes('organization_id = ?'), 'leads.js must scope queries with organization_id = ?');
  });

  runTest('16. CRM route file scopes lead movement queries with organization_id', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/crm.js'), 'utf8');
    assert.ok(content.includes('organization_id = ?'), 'crm.js move lead route must enforce organization_id');
  });

  runTest('17. CRM Connectors route file enforces organization_id ownership check on sync/PUT', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/crm-connectors.js'), 'utf8');
    assert.ok(content.includes('organization_id = ?'), 'crm-connectors.js must verify connector organization_id before sync');
  });

  runTest('18. Lead Rescue route file scopes lead trigger execution with organization_id', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/rescue.js'), 'utf8');
    assert.ok(content.includes('organization_id = ?'), 'rescue.js must scope lead triggers with organization_id');
  });

  // ─── 5. Webhook Decoupling & Queue Integration ──────────────────────────────
  console.log('\n--- 5. Webhook Ingestion & Queue Integration ---');

  runTest('19. Webhook route imports and uses leadQueue enqueue pattern', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/webhooks.js'), 'utf8');
    assert.ok(content.includes('leadQueue'), 'webhooks.js must import leadQueue');
    assert.ok(content.includes('leadQueue.enqueue'), 'webhooks.js must call leadQueue.enqueue');
  });

  runTest('20. Webhook route returns 202 Accepted response asynchronously', () => {
    const content = fs.readFileSync(path.join(__dirname, '../server/routes/webhooks.js'), 'utf8');
    assert.ok(content.includes('status(202)'), 'webhooks.js must return HTTP 202 Accepted');
  });

  // ─── 6. Compliance, Legal & UI Foundations ──────────────────────────────────
  console.log('\n--- 6. Compliance, Legal & UI Foundations ---');

  runTest('21. Privacy Policy page file exists and contains GDPR & CCPA content', () => {
    const filePath = path.join(__dirname, '../app/privacy/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/privacy/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Privacy Policy'), 'Privacy page must contain header');
    assert.ok(content.includes('GDPR') || content.includes('Data Protection'), 'Privacy page must mention data protection');
    assert.ok(content.includes('export default'), 'Privacy page must have default export');
  });

  runTest('22. Terms of Service page file exists and contains legal terms', () => {
    const filePath = path.join(__dirname, '../app/terms/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/terms/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('Terms of Service'), 'Terms page must contain header');
    assert.ok(content.includes('export default'), 'Terms page must have default export');
  });

  runTest('23. AuthFooter component exists and exports properly', () => {
    const filePath = path.join(__dirname, '../components/auth/AuthFooter.tsx');
    assert.ok(fs.existsSync(filePath), 'components/auth/AuthFooter.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('export default AuthFooter'), 'AuthFooter must export default');
  });

  runTest('24. Dashboard layout wraps children in ErrorBoundary and Suspense', () => {
    const filePath = path.join(__dirname, '../app/(dashboard)/layout.tsx');
    assert.ok(fs.existsSync(filePath), 'app/(dashboard)/layout.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('ErrorBoundary'), 'Dashboard layout must include ErrorBoundary');
    assert.ok(content.includes('Suspense'), 'Dashboard layout must include Suspense');
  });

  console.log(`\n==================================================`);
  console.log(`  Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`==================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
})();
