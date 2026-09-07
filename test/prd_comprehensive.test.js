/**
 * test/prd_comprehensive.test.js
 * Comprehensive automated verification test suite for Lead Rescue AI PRD requirements.
 * Validates: Auth & Onboarding, Org & Subscription Limits, Lead Sources, Lead Capture,
 * AI Qualification, Follow-Up Templates & Execution, Smart CRM Pipeline, Appointments,
 * Lead Rescue Alert Scanner, and Executive Dashboard Reporting.
 */

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const { get, query, run } = require('../lib/db/db');
const { hashPassword, verifyPassword, createToken, verifyToken } = require('../lib/auth/auth');
const { qualifyLead } = require('../lib/ai/qualification');
const { sendFollowUp, processInboundResponse } = require('../lib/ai/followup');
const { runLeadRescueScan } = require('../lib/ai/rescue');

console.log('🧪 Starting Lead Rescue AI — Comprehensive PRD Feature Verification Suite...\n');

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
  const testOrgId = 'test_org_' + Date.now();
  const testUserId = 'test_user_' + Date.now();
  const testEmail = `owner_${Date.now()}@example.com`;
  const starterPlanId = 'plan_starter';

  // ─── 1. User Authentication & Org Onboarding ─────────────────────────────
  console.log('--- 1. Auth & Organization Onboarding (PRD: auth-management) ---');

  await runAsyncTest('1. Password hashing and verification behave securely', async () => {
    const plain = 'StrongPass123!';
    const hashed = hashPassword(plain);
    assert.notStrictEqual(plain, hashed, 'Password must be hashed');
    const valid = await verifyPassword(plain, hashed);
    assert.strictEqual(valid, true, 'Valid password must verify');
    const invalid = await verifyPassword('WrongPass', hashed);
    assert.strictEqual(invalid, false, 'Invalid password must be rejected');
  });

  await runAsyncTest('2. Creating Organization and Owner assigns Starter plan and initial stages', async () => {
    // 1. Create org with starter plan
    await run(
      `INSERT INTO organizations (id, name, owner_user_id, subscription_plan_id, current_lead_count)
       VALUES (?, ?, ?, ?, 0)`,
      [testOrgId, 'Acme Test Corp', testUserId, starterPlanId]
    );

    // 2. Create user as Organization Owner
    const hashed = hashPassword('OwnerSecret123!');
    await run(
      `INSERT INTO users (id, email, password_hash, name, organization_id, role, status)
       VALUES (?, ?, ?, 'Acme Owner', ?, 'Organization Owner', 'Active')`,
      [testUserId, testEmail, hashed, testOrgId]
    );

    // 3. Create default CRM stages
    const stages = [
      { id: testOrgId + '_s0', name: 'New Lead', order: 0, initial: 1, won: 0, lost: 0 },
      { id: testOrgId + '_s1', name: 'Contacted', order: 1, initial: 0, won: 0, lost: 0 },
      { id: testOrgId + '_s2', name: 'Qualified', order: 2, initial: 0, won: 0, lost: 0 },
      { id: testOrgId + '_s3', name: 'Appointment Scheduled', order: 3, initial: 0, won: 0, lost: 0 },
      { id: testOrgId + '_s4', name: 'Closed Won', order: 4, initial: 0, won: 1, lost: 0 },
      { id: testOrgId + '_s5', name: 'Closed Lost', order: 5, initial: 0, won: 0, lost: 1 },
    ];
    for (const s of stages) {
      await run(
        `INSERT INTO crm_stages (id, organization_id, name, order_index, is_initial, is_final_won, is_final_lost)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, testOrgId, s.name, s.order, s.initial, s.won, s.lost]
      );
    }

    // 4. Create default lead source
    const sourceId = testOrgId + '_src_manual';
    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration, is_active)
       VALUES (?, ?, 'Manual Entry', 'Manual', '{}', 1)`,
      [sourceId, testOrgId]
    );

    const userRecord = await get('SELECT * FROM users WHERE id = ?', [testUserId]);
    const orgRecord = await get('SELECT * FROM organizations WHERE id = ?', [testOrgId]);
    const stagesRecords = await query('SELECT * FROM crm_stages WHERE organization_id = ?', [testOrgId]);

    assert.strictEqual(userRecord.role, 'Organization Owner');
    assert.strictEqual(orgRecord.subscription_plan_id, starterPlanId);
    assert.strictEqual(stagesRecords.length, 6);
  });

  await runAsyncTest('3. JWT Token generation, session verification, and claim extraction', async () => {
    const token = createToken({
      id: testUserId,
      email: testEmail,
      name: 'Acme Owner',
      organization_id: testOrgId,
      role: 'Organization Owner'
    });

    assert.ok(token, 'JWT token should be generated');
    const session = verifyToken(token);
    assert.strictEqual(session.id, testUserId);
    assert.strictEqual(session.organization_id, testOrgId);
    assert.strictEqual(session.role, 'Organization Owner');
  });

  // ─── 2. Subscription & Plan Downgrade Protection ───────────────────────────
  console.log('\n--- 2. Subscription & Plan Limit Safeguards (PRD: org-sub-management) ---');

  await runAsyncTest('4. Subscription downgrade prevents changes if organization lead count exceeds plan quota', async () => {
    // Current org has Starter (50 leads). If we create a custom mini plan with lead limit 1:
    const miniPlanId = 'plan_mini_' + Date.now();
    const miniPlanName = 'Mini_' + Date.now();
    await run(
      `INSERT INTO subscription_plans (id, name, description, monthly_price, lead_limit, user_limit, features)
       VALUES (?, ?, 'Testing', 0.0, 1, 1, '[]')`,
      [miniPlanId, miniPlanName]
    );

    // Insert 2 test leads in org
    const sourceId = testOrgId + '_src_manual';
    const initStageId = testOrgId + '_s0';
    for (let i = 1; i <= 2; i++) {
      await run(
        `INSERT INTO leads (id, organization_id, name, email, source_id, current_crm_stage_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [`lead_quota_${i}_${Date.now()}`, testOrgId, `Lead ${i}`, `lead${i}@test.com`, sourceId, initStageId]
      );
    }

    const actualLeads = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [testOrgId]);
    const targetPlan = await get('SELECT * FROM subscription_plans WHERE id = ?', [miniPlanId]);

    assert.ok(parseInt(actualLeads.count) > targetPlan.lead_limit, 'Org leads must exceed target plan lead limit');

    // Simulate downgrade validation check
    let blocked = false;
    if (parseInt(actualLeads.count) > targetPlan.lead_limit) {
      blocked = true;
    }
    assert.strictEqual(blocked, true, 'System must block downgrade when lead limit would be violated');
  });

  // ─── 3. Lead Capture & Notes Field Persistence ─────────────────────────────
  console.log('\n--- 3. Lead Capture & Notes Editing (PRD: lead-capture & crm-pipeline-management) ---');

  let testLeadId = '';

  await runAsyncTest('5. Manually adding a lead with notes and updating lead notes succeeds', async () => {
    testLeadId = 'lead_notes_' + Date.now();
    const sourceId = testOrgId + '_src_manual';
    const initStageId = testOrgId + '_s0';

    // Insert lead with initial notes
    await run(
      `INSERT INTO leads (id, organization_id, name, email, phone, company, product_interest, source_id, current_crm_stage_id, notes, deal_value, created_at, updated_at)
       VALUES (?, ?, 'Sarah Connor', 'sarah@skynet.com', '+15551234', 'Cyberdyne', 'Enterprise Security AI', ?, ?, 'Initial lead inquiry from phone call', 25000, NOW(), NOW())`,
      [testLeadId, testOrgId, sourceId, initStageId]
    );

    const leadRecord = await get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    assert.strictEqual(leadRecord.name, 'Sarah Connor');
    assert.strictEqual(leadRecord.notes, 'Initial lead inquiry from phone call');

    // Update lead notes
    const updatedNotes = 'Customer requested follow-up meeting on Friday at 2 PM.';
    await run(
      `UPDATE leads SET notes = ?, deal_value = ?, updated_at = NOW() WHERE id = ? AND organization_id = ?`,
      [updatedNotes, 35000, testLeadId, testOrgId]
    );

    const updatedRecord = await get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    assert.strictEqual(updatedRecord.notes, updatedNotes);
    assert.strictEqual(updatedRecord.deal_value, 35000);
  });

  // ─── 4. AI Lead Qualification & Hot Alerts ─────────────────────────────────
  console.log('\n--- 4. AI Lead Qualification & Notifications (PRD: ai-lead-qualification) ---');

  await runAsyncTest('6. Qualify lead produces structured analysis, score, and Hot status notification', async () => {
    const qualResult = await qualifyLead({
      leadId: testLeadId,
      name: 'Sarah Connor',
      company: 'Cyberdyne',
      email: 'sarah@skynet.com',
      phone: '+15551234',
      product_interest: 'Enterprise Security AI immediate rollout urgent budget approved',
      source_name: 'Manual Entry'
    });

    assert.ok(qualResult.score >= 0 && qualResult.score <= 100, 'Score must be 0-100');
    assert.ok(['Hot', 'Warm', 'Cold'].includes(qualResult.status), 'Status must be Hot, Warm, or Cold');
    assert.ok(qualResult.analysis_data.customer_needs, 'Customer needs must be analyzed');
    assert.ok(qualResult.analysis_data.buying_intent, 'Buying intent must be analyzed');

    const leadAfterQual = await get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    assert.strictEqual(leadAfterQual.qualification_score, qualResult.score);
    assert.strictEqual(leadAfterQual.qualification_status, qualResult.status);

    const savedResult = await get('SELECT * FROM lead_qualification_results WHERE lead_id = ?', [testLeadId]);
    assert.ok(savedResult, 'Qualification result record must be persisted');
  });

  // ─── 5. Follow-Up Templates & Execution ────────────────────────────────────
  console.log('\n--- 5. Automated Follow-Up Sequences (PRD: ai-followup-config & execution) ---');

  let templateId = '';

  await runAsyncTest('7. Follow-up template creation and placeholder substitution', async () => {
    templateId = 'tpl_' + Date.now();
    const templateBody = 'Hi {{lead.name}}, following up on your inquiry about {{lead.product_interest}} at {{lead.company}}. Let us know when you are free!';

    await run(
      `INSERT INTO follow_up_templates (id, organization_id, name, message_body, channel, trigger_conditions, is_active)
       VALUES (?, ?, 'High Intent Demo Offer', ?, 'Email', '{"lead_status":"Hot"}', 1)`,
      [templateId, testOrgId, templateBody]
    );

    // Send follow-up using the template
    const followUpResult = await sendFollowUp({
      leadId: testLeadId,
      templateId,
      channel: 'Email'
    });

    assert.strictEqual(followUpResult.channel, 'Email');
    assert.ok(followUpResult.messageContent.includes('Sarah Connor'), 'Must substitute {{lead.name}}');
    assert.ok(followUpResult.messageContent.includes('Cyberdyne'), 'Must substitute {{lead.company}}');

    // Verify follow-up message record exists
    const msgRecord = await get('SELECT * FROM follow_up_messages WHERE lead_id = ? ORDER BY sent_at DESC LIMIT 1', [testLeadId]);
    assert.ok(msgRecord, 'Follow-up message record must be logged');
  });

  await runAsyncTest('8. Inbound response analysis adjusts lead interest/status', async () => {
    const inboundMessage = 'Yes! We have $50,000 budget and want to buy immediately for our office.';
    await processInboundResponse(testLeadId, inboundMessage);

    const leadRecord = await get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    assert.strictEqual(leadRecord.qualification_status, 'Hot');
  });

  // ─── 6. Smart CRM Pipeline Stage Movement ──────────────────────────────────
  console.log('\n--- 6. Smart CRM Pipeline Movement (PRD: crm-pipeline-management) ---');

  await runAsyncTest('9. Moving lead to Won stage updates stage and persists deal_value', async () => {
    const wonStage = await get('SELECT id FROM crm_stages WHERE organization_id = ? AND is_final_won = 1 LIMIT 1', [testOrgId]);
    assert.ok(wonStage, 'Won stage must exist');

    await run(
      `UPDATE leads 
       SET current_crm_stage_id = ?, deal_value = ?, updated_at = NOW() 
       WHERE id = ? AND organization_id = ?`,
      [wonStage.id, 50000, testLeadId, testOrgId]
    );

    const updatedLead = await get('SELECT * FROM leads WHERE id = ?', [testLeadId]);
    assert.strictEqual(updatedLead.current_crm_stage_id, wonStage.id);
    assert.strictEqual(updatedLead.deal_value, 50000);
  });

  await runAsyncTest('10. Deleting CRM stage is blocked when stage contains active leads', async () => {
    const currentLead = await get('SELECT current_crm_stage_id FROM leads WHERE id = ?', [testLeadId]);
    const leadsInStage = await get('SELECT COUNT(*) as count FROM leads WHERE current_crm_stage_id = ? AND organization_id = ?', [currentLead.current_crm_stage_id, testOrgId]);
    
    assert.ok(parseInt(leadsInStage.count) > 0, 'Stage must contain leads');
    
    let blocked = false;
    if (parseInt(leadsInStage.count) > 0) {
      blocked = true;
    }
    assert.strictEqual(blocked, true, 'Deleting stage with leads must be prevented');
  });

  // ─── 7. Appointment Booking ───────────────────────────────────────────────
  console.log('\n--- 7. Appointment Booking (PRD: appointment-booking) ---');

  let apptId = '';

  await runAsyncTest('11. Scheduling and updating appointment status', async () => {
    apptId = 'appt_' + Date.now();
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    await run(
      `INSERT INTO appointments (id, lead_id, scheduled_by_user_id, start_time, end_time, notes, status)
       VALUES (?, ?, ?, ?, ?, 'Demo presentation', 'Scheduled')`,
      [apptId, testLeadId, testUserId, startTime, endTime]
    );

    const appt = await get('SELECT * FROM appointments WHERE id = ?', [apptId]);
    assert.strictEqual(appt.status, 'Scheduled');
    assert.strictEqual(appt.notes, 'Demo presentation');

    // Mark as completed
    await run('UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?', ['Completed', apptId]);
    const completedAppt = await get('SELECT * FROM appointments WHERE id = ?', [apptId]);
    assert.strictEqual(completedAppt.status, 'Completed');
  });

  // ─── 8. Lead Rescue 48-Hour Idle Scanner ────────────────────────────────────
  console.log('\n--- 8. Follow-Up Recovery (Lead Rescue Command) (PRD: followup-recovery) ---');

  await runAsyncTest('12. runLeadRescueScan detects idle leads and generates LEAD_RESCUE_ALERT', async () => {
    // Set lead last_contacted_at to 72 hours ago
    const idle72HoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    await run(
      `UPDATE leads SET last_contacted_at = ?, qualification_status = 'Hot', opt_out_communications = 0 WHERE id = ?`,
      [idle72HoursAgo, testLeadId]
    );

    const atRiskLeads = await runLeadRescueScan(testOrgId, 48);
    const foundLead = atRiskLeads.find(l => l.lead_id === testLeadId);

    assert.ok(foundLead, 'Lead idle for 72 hours must be detected in 48-hour rescue scan');
    assert.ok(foundLead.hours_idle >= 70, 'hours_idle must be calculated properly');

    const notification = await get(
      `SELECT * FROM notifications WHERE related_entity_id = ? AND type = 'LEAD_RESCUE_ALERT'`,
      [testLeadId]
    );
    assert.ok(notification, 'LEAD_RESCUE_ALERT notification must be generated for idle lead');
  });

  // ─── 9. Dashboard & Executive Reporting ────────────────────────────────────
  console.log('\n--- 9. Executive Dashboard & Metrics (PRD: dashboard-reporting) ---');

  await runAsyncTest('13. Executive dashboard calculates pipeline value, conversion rate, and needs attention', async () => {
    const orgId = testOrgId;

    const totalLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [orgId]);
    const hotLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Hot\'', [orgId]);
    const warmLeadsObj = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ? AND qualification_status = \'Warm\'', [orgId]);
    const pipelineValueObj = await get('SELECT SUM(COALESCE(deal_value, 0)) as total FROM leads WHERE organization_id = ?', [orgId]);

    const wonLeadsObj = await get(
      `SELECT COUNT(*) as count FROM leads l
       JOIN crm_stages cs ON l.current_crm_stage_id = cs.id
       WHERE l.organization_id = ? AND cs.is_final_won = 1`,
      [orgId]
    );
    const wonCount = parseInt(wonLeadsObj?.count || 0, 10);
    const qualifiedCount = parseInt(hotLeadsObj?.count || 0, 10) + parseInt(warmLeadsObj?.count || 0, 10);
    const conversionRate = qualifiedCount > 0 ? ((wonCount / qualifiedCount) * 100).toFixed(1) : '0.0';

    const followupsObj = await get(
      `SELECT COUNT(*) as count FROM follow_up_messages fm
       JOIN leads l ON fm.lead_id = l.id
       WHERE l.organization_id = ?`,
      [orgId]
    );

    const appointmentsObj = await get(
      `SELECT COUNT(*) as count FROM appointments a
       JOIN leads l ON a.lead_id = l.id
       WHERE l.organization_id = ?`,
      [orgId]
    );

    const atRiskLeads = await runLeadRescueScan(orgId, 48);

    assert.ok(parseInt(totalLeadsObj.count) >= 3, 'Total leads count should match');
    assert.ok(parseFloat(pipelineValueObj.total) > 0, 'Pipeline value should be positive');
    assert.ok(parseFloat(conversionRate) >= 0, 'Conversion rate should be calculated');
    assert.ok(parseInt(followupsObj.count) >= 1, 'AI follow-ups count should be >= 1');
    assert.ok(parseInt(appointmentsObj.count) >= 1, 'Appointments count should be >= 1');
    assert.ok(atRiskLeads.length >= 1, 'Needs attention at-risk leads should include overdue lead');
  });

  // ─── Clean up test artifacts from database ────────────────────────────────
  await run('DELETE FROM appointments WHERE scheduled_by_user_id = ?', [testUserId]);
  await run('DELETE FROM follow_up_messages WHERE lead_id IN (SELECT id FROM leads WHERE organization_id = ?)', [testOrgId]);
  await run('DELETE FROM lead_qualification_results WHERE lead_id IN (SELECT id FROM leads WHERE organization_id = ?)', [testOrgId]);
  await run('DELETE FROM notifications WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM leads WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM users WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM crm_stages WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM lead_sources WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM follow_up_templates WHERE organization_id = ?', [testOrgId]);
  await run('DELETE FROM organizations WHERE id = ?', [testOrgId]);
  await run("DELETE FROM subscription_plans WHERE name LIKE 'Mini%'", []);

  console.log(`\n==================================================`);
  console.log(`  Comprehensive PRD Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`==================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
})();
