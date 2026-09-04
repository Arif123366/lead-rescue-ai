/**
 * server/routes/payments.js
 * Express router for /api/v1/payments
 */

const express = require('express');
const router = express.Router();

const { get, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { createStripeCheckoutSession } = require('../../lib/payments/stripe');
const { createPayoneerCheckoutSession } = require('../../lib/payments/payoneer');
const { cryptoNativeOrRandomUUID } = require('../../lib/utils/uuid');

// POST /api/v1/payments/checkout
router.post('/checkout', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can initiate subscription upgrades.' });
    }

    const { plan_id, payment_provider } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required.' });

    const provider = (payment_provider || 'stripe').toLowerCase();
    if (provider !== 'stripe' && provider !== 'payoneer') {
      return res.status(400).json({ error: 'Unsupported payment provider. Select Stripe or Payoneer.' });
    }

    const targetPlan = await get('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
    if (!targetPlan) return res.status(404).json({ error: 'Selected subscription plan not found.' });

    const originUrl = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';

    if (provider === 'stripe') {
      const result = await createStripeCheckoutSession({
        organizationId: session.organization_id,
        planId: targetPlan.id,
        planName: targetPlan.name,
        amount: targetPlan.monthly_price,
        customerEmail: session.email,
        originUrl
      });

      return res.json({
        success: true,
        provider: 'stripe',
        checkout_url: result.checkoutUrl,
        session_id: result.sessionId
      });
    } else {
      const result = await createPayoneerCheckoutSession({
        organizationId: session.organization_id,
        planId: targetPlan.id,
        planName: targetPlan.name,
        amount: targetPlan.monthly_price,
        customerEmail: session.email,
        originUrl
      });

      return res.json({
        success: true,
        provider: 'payoneer',
        checkout_url: result.checkoutUrl,
        session_id: result.sessionId
      });
    }
  } catch (err) {
    console.error('[payments/checkout]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/payments/checkout/confirm
router.get('/checkout/confirm', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const provider = req.query.provider || 'stripe';
    const frontendUrl = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3000';

    if (!sessionId) {
      return res.redirect(`${frontendUrl}/settings?tab=billing&payment=error`);
    }

    const tx = await get('SELECT * FROM payment_transactions WHERE checkout_session_id = ?', [sessionId]);
    if (!tx) {
      return res.redirect(`${frontendUrl}/settings?tab=billing&payment=not_found`);
    }

    const plan = await get('SELECT * FROM subscription_plans WHERE id = ?', [tx.plan_id]);

    await run(`UPDATE payment_transactions SET status = 'completed', updated_at = NOW() WHERE id = ?`, [tx.id]);
    await run(
      `UPDATE organizations SET subscription_plan_id = ?, payment_provider = ?, payment_status = 'active', payment_reference_id = ?, updated_at = NOW() WHERE id = ?`,
      [tx.plan_id, provider, sessionId, tx.organization_id]
    );

    const owner = await get("SELECT id FROM users WHERE organization_id = ? AND role = 'Organization Owner' LIMIT 1", [tx.organization_id]);
    if (owner) {
      await run(
        `INSERT INTO notifications (id, user_id, organization_id, type, message, is_read, created_at, updated_at)
         VALUES (?, ?, ?, 'Payment Success', ?, 0, NOW(), NOW())`,
        [
          cryptoNativeOrRandomUUID(),
          owner.id,
          tx.organization_id,
          `🎉 Subscription successfully upgraded to ${plan?.name || 'Pro'} via ${provider.toUpperCase()}!`
        ]
      );
    }

    return res.redirect(`${frontendUrl}/settings?tab=billing&payment=success`);
  } catch (err) {
    console.error('[payments/checkout/confirm]', err);
    return res.status(500).send('Internal server error');
  }
});

module.exports = router;
