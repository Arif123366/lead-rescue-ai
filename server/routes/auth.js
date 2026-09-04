/**
 * server/routes/auth.js
 * Express router for /api/v1/auth
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { get, run } = require('../../lib/db/db');
const {
  verifyPassword,
  hashPassword,
  createToken,
  getCurrentUser,
  setExpressSessionCookie,
  clearExpressSessionCookie,
} = require('../../lib/auth/auth');
const {
  validate,
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
} = require('../../lib/validation/schemas');
const { sendPasswordResetEmail } = require('../../lib/email/mailer');

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { data, error } = validate(loginSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { email, password } = data;

    const user = await get(
      'SELECT id, email, name, password_hash, organization_id, role, status FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Your account is pending. Please accept the invitation email sent to you.' });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      organization_id: user.organization_id,
      role: user.role,
    });

    setExpressSessionCookie(res, token);
    return res.json({
      message: 'Login successful.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token, // Also return token in body for mobile/bearer clients
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// POST /api/v1/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { data, error } = validate(signupSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { email, password, name, organization_name } = data;

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const starterPlan = await get(`SELECT id FROM subscription_plans WHERE name = 'Starter' LIMIT 1`);
    if (!starterPlan) {
      return res.status(500).json({ error: 'Subscription plans not configured. Please run database seed.' });
    }

    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    await run(
      `INSERT INTO organizations (id, name, owner_user_id, subscription_plan_id, current_lead_count)
       VALUES (?, ?, ?, ?, 0)`,
      [orgId, organization_name.trim(), userId, starterPlan.id]
    );

    const passwordHash = hashPassword(password);
    await run(
      `INSERT INTO users (id, email, password_hash, name, organization_id, role, status)
       VALUES (?, ?, ?, ?, ?, 'Organization Owner', 'Active')`,
      [userId, email.toLowerCase(), passwordHash, name.trim(), orgId]
    );

    const stages = [
      { name: 'New Lead', order_index: 0, is_initial: 1, is_final_won: 0, is_final_lost: 0 },
      { name: 'Contacted', order_index: 1, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Qualified', order_index: 2, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Proposal Sent', order_index: 3, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Negotiation', order_index: 4, is_initial: 0, is_final_won: 0, is_final_lost: 0 },
      { name: 'Closed Won', order_index: 5, is_initial: 0, is_final_won: 1, is_final_lost: 0 },
      { name: 'Closed Lost', order_index: 6, is_initial: 0, is_final_won: 0, is_final_lost: 1 },
    ];
    for (const stage of stages) {
      await run(
        `INSERT INTO crm_stages (id, organization_id, name, order_index, is_initial, is_final_won, is_final_lost)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        [crypto.randomUUID(), orgId, stage.name, stage.order_index, stage.is_initial, stage.is_final_won, stage.is_final_lost]
      );
    }

    await run(
      `INSERT INTO lead_sources (id, organization_id, name, type, configuration)
       VALUES (?, ?, 'Manual Entry', 'Manual', '{}') ON CONFLICT (id) DO NOTHING`,
      [crypto.randomUUID(), orgId]
    );

    const token = createToken({
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      organization_id: orgId,
      role: 'Organization Owner',
    });

    setExpressSessionCookie(res, token);
    return res.status(201).json({
      message: 'Account created successfully.',
      user_id: userId,
      token,
    });
  } catch (err) {
    console.error('[auth/signup]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', async (req, res) => {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await get(
      'SELECT id, email, name, organization_id, role, created_at FROM users WHERE id = ?',
      [session.id]
    );
    const org = await get(
      'SELECT o.*, sp.name as plan_name, sp.lead_limit, sp.user_limit FROM organizations o JOIN subscription_plans sp ON o.subscription_plan_id = sp.id WHERE o.id = ?',
      [session.organization_id]
    );

    return res.json({ user, organization: org });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  clearExpressSessionCookie(res);
  return res.json({ message: 'Logged out successfully' });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { data, error } = validate(forgotPasswordSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { email } = data;
    const user = await get('SELECT id, name, email FROM users WHERE email = ?', [email.toLowerCase()]);

    if (user) {
      await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
      const rawToken = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await run(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), user.id, tokenHash, expiresAt]
      );

      try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken });
      } catch (emailErr) {
        console.error('[reset-password] Email send failed:', emailErr);
      }
    }

    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('[auth/reset-password POST]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// PATCH /api/v1/auth/reset-password
router.patch('/reset-password', async (req, res) => {
  try {
    const { data, error } = validate(resetPasswordSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { token, password } = data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await get(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }
    if (resetRecord.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
    }
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const newPasswordHash = hashPassword(password);
    await run(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`, [newPasswordHash, resetRecord.user_id]);
    await run(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [resetRecord.id]);

    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[auth/reset-password PATCH]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// POST /api/v1/auth/accept-invite
router.post('/accept-invite', async (req, res) => {
  try {
    const { data, error } = validate(acceptInviteSchema, req.body);
    if (error || !data) return res.status(422).json({ error: error || 'Invalid request' });

    const { token, password, name } = data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await get(
      'SELECT id, organization_id, email, name, role, expires_at, accepted_at FROM user_invitations WHERE token_hash = ?',
      [tokenHash]
    );

    if (!invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation link.' });
    }
    if (invitation.accepted_at) {
      return res.status(400).json({ error: 'This invitation has already been accepted.' });
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired. Please ask your organization owner to send a new one.' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [invitation.email]);
    if (existingUser) {
      const passwordHash = hashPassword(password);
      await run(
        `UPDATE users SET password_hash = ?, status = 'Active', updated_at = NOW() WHERE id = ?`,
        [passwordHash, existingUser.id]
      );
      await run(`UPDATE user_invitations SET accepted_at = NOW() WHERE id = ?`, [invitation.id]);
      return res.json({ message: 'Account activated. Please log in.' });
    }

    const userId = crypto.randomUUID();
    const finalName = name?.trim() || invitation.name;
    const passwordHash = hashPassword(password);

    await run(
      `INSERT INTO users (id, email, password_hash, name, organization_id, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [userId, invitation.email, passwordHash, finalName, invitation.organization_id, invitation.role]
    );

    await run(`UPDATE user_invitations SET accepted_at = NOW() WHERE id = ?`, [invitation.id]);

    const token_jwt = createToken({
      id: userId,
      email: invitation.email,
      name: finalName,
      organization_id: invitation.organization_id,
      role: invitation.role,
    });

    setExpressSessionCookie(res, token_jwt);
    return res.json({
      message: 'Invitation accepted. Welcome to Lead Rescue AI!',
      user: { id: userId, email: invitation.email, name: finalName, role: invitation.role },
      token: token_jwt,
    });
  } catch (err) {
    console.error('[auth/accept-invite]', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

module.exports = router;
