/**
 * server/routes/organizations.js
 * Express router for /api/v1/organizations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { get, query, run } = require('../../lib/db/db');
const { getCurrentUser } = require('../../lib/auth/auth');
const { sendUserInviteEmail } = require('../../lib/email/mailer');
const { validate, inviteUserSchema } = require('../../lib/validation/schemas');

// GET /api/v1/organizations
router.get('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const org = await get(
      `SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit, sp.monthly_price, sp.features
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [session.organization_id]
    );

    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const currentLeads = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [session.organization_id]);
    const currentUsers = await get('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);

    return res.json({
      organization: {
        ...org,
        features: org.features ? JSON.parse(org.features) : [],
        current_lead_count: parseInt(currentLeads?.count || 0, 10),
        current_user_count: parseInt(currentUsers?.count || 0, 10)
      }
    });
  } catch (err) {
    console.error('[organizations GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/organizations
router.put('/', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can update organization details.' });
    }

    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    await run('UPDATE organizations SET name = ?, updated_at = NOW() WHERE id = ?', [name.trim(), session.organization_id]);

    return res.json({ message: 'Organization updated successfully.' });
  } catch (err) {
    console.error('[organizations PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/organizations/team
router.get('/team', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const [members, pendingInvites] = await Promise.all([
      query(
        'SELECT id, email, name, role, status, created_at FROM users WHERE organization_id = ? ORDER BY created_at ASC',
        [session.organization_id]
      ),
      query(
        `SELECT id, email, name, role, created_at, expires_at, accepted_at
         FROM user_invitations
         WHERE organization_id = ? AND accepted_at IS NULL
         ORDER BY created_at DESC`,
        [session.organization_id]
      ),
    ]);

    return res.json({
      team: members,
      pending_invitations: pendingInvites.filter(
        (inv) => new Date(inv.expires_at) > new Date()
      ),
    });
  } catch (err) {
    console.error('[organizations/team GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/organizations/team
router.post('/team', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can invite team members.' });
    }

    const { data, error } = validate(inviteUserSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { email, name, role } = data;

    const orgInfo = await get(
      `SELECT o.id, sp.user_limit, o.name as org_name,
              (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as actual_users
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [session.organization_id]
    );

    if (orgInfo && parseInt(orgInfo.actual_users, 10) >= orgInfo.user_limit) {
      return res.status(400).json({
        error: `Team member limit of ${orgInfo.user_limit} reached on your current plan. Please upgrade to add more members.`
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const existingInvite = await get(
      `SELECT id FROM user_invitations WHERE email = ? AND organization_id = ? AND accepted_at IS NULL AND expires_at > NOW()`,
      [normalizedEmail, session.organization_id]
    );
    if (existingInvite) {
      return res.status(409).json({ error: 'A pending invitation already exists for this email.' });
    }

    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await run(
      `INSERT INTO user_invitations (id, organization_id, email, name, role, token_hash, expires_at, invited_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), session.organization_id, normalizedEmail, name.trim(), role, tokenHash, expiresAt, session.id]
    );

    try {
      await sendUserInviteEmail({
        to: normalizedEmail,
        name: name.trim(),
        token: rawToken,
        organizationName: orgInfo?.org_name || 'Your Organization',
        inviterName: session.name,
        role,
      });
    } catch (emailErr) {
      console.error('[team invite] Email send failed:', emailErr);
    }

    function getAppUrl(request) {
      const origin = request?.headers?.origin || request?.headers?.referer;
      if (origin && typeof origin === 'string' && !origin.includes('localhost') && origin !== 'null') {
        try { return new URL(origin).origin; } catch { return origin.replace(/\/$/, ''); }
      }
      const envUrl = process.env.APP_URL || process.env.FRONTEND_URL;
      if (envUrl && !envUrl.includes('localhost')) {
        return envUrl.replace(/\/$/, '');
      }
      return 'https://leadrescueai.xilxil.com';
    }

    const appUrl = getAppUrl(req);
    const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`;

    return res.status(201).json({
      message: `Invitation sent to ${normalizedEmail}.`,
      invite_url: inviteUrl,
      invitation: { email: normalizedEmail, name: name.trim(), role, expires_at: expiresAt, invite_url: inviteUrl },
    });
  } catch (err) {
    console.error('[organizations/team POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/organizations/team
router.delete('/team', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can remove team members.' });
    }

    const userId = req.query.id || req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'User ID required.' });
    if (userId === session.id) return res.status(400).json({ error: 'Organization Owner cannot remove themselves.' });

    const member = await get('SELECT id FROM users WHERE id = ? AND organization_id = ?', [userId, session.organization_id]);
    if (!member) return res.status(404).json({ error: 'User not found in your organization.' });

    await run('DELETE FROM users WHERE id = ? AND organization_id = ?', [userId, session.organization_id]);

    return res.json({ message: 'Team member removed successfully.' });
  } catch (err) {
    console.error('[organizations/team DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/organizations/team
router.patch('/team', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can change member roles.' });
    }

    const { user_id, role } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: 'user_id and role are required.' });

    const validRoles = ['Sales Representative', 'Marketing Manager', 'Organization Owner'];
    if (!validRoles.includes(role)) return res.status(422).json({ error: 'Invalid role.' });

    await run(
      `UPDATE users SET role = ?, updated_at = NOW() WHERE id = ? AND organization_id = ?`,
      [role, user_id, session.organization_id]
    );

    return res.json({ message: 'Role updated successfully.' });
  } catch (err) {
    console.error('[organizations/team PATCH]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/organizations/subscription
router.get('/subscription', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const currentOrg = await get(
      `SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit, sp.monthly_price, sp.features
       FROM organizations o
       JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = ?`,
      [session.organization_id]
    );

    const availablePlans = await query('SELECT * FROM subscription_plans ORDER BY monthly_price ASC');
    const actualLeads = await get('SELECT COUNT(*) as count FROM leads WHERE organization_id = ?', [session.organization_id]);
    const actualUsers = await get('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);

    return res.json({
      current_subscription: {
        ...currentOrg,
        features: currentOrg.features ? JSON.parse(currentOrg.features) : [],
        actual_leads: parseInt(actualLeads?.count || 0, 10),
        actual_users: parseInt(actualUsers?.count || 0, 10)
      },
      available_plans: availablePlans.map(p => ({
        ...p,
        features: p.features ? JSON.parse(p.features) : []
      }))
    });
  } catch (err) {
    console.error('[organizations/subscription GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/organizations/subscription
router.post('/subscription', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (session.role !== 'Organization Owner') {
      return res.status(403).json({ error: 'Only Organization Owners can change the subscription plan.' });
    }

    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required.' });

    const targetPlan = await get('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
    if (!targetPlan) return res.status(404).json({ error: 'Selected subscription plan not found.' });

    const actualUsers = await get('SELECT COUNT(*) as count FROM users WHERE organization_id = ?', [session.organization_id]);
    const userCount = parseInt(actualUsers?.count || 0, 10);

    if (userCount > targetPlan.user_limit) {
      return res.status(400).json({
        error: `Cannot downgrade to ${targetPlan.name} because your organization has ${userCount} users, but the plan limit is ${targetPlan.user_limit}. Please remove extra team members first.`
      });
    }

    await run('UPDATE organizations SET subscription_plan_id = ?, updated_at = NOW() WHERE id = ?', [plan_id, session.organization_id]);

    return res.json({
      message: `Subscription successfully updated to ${targetPlan.name}.`,
      plan: {
        ...targetPlan,
        features: targetPlan.features ? JSON.parse(targetPlan.features) : []
      }
    });
  } catch (err) {
    console.error('[organizations/subscription POST]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
