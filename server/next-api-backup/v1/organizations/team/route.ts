import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { get, query, run } from '@/lib/db/db';
import { sendUserInviteEmail } from '@/lib/email/mailer';
import { validate, inviteUserSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [members, pendingInvites] = await Promise.all([
    query<any>(
      'SELECT id, email, name, role, status, created_at FROM users WHERE organization_id = ? ORDER BY created_at ASC',
      [session.organization_id]
    ),
    query<any>(
      `SELECT id, email, name, role, created_at, expires_at, accepted_at
       FROM user_invitations
       WHERE organization_id = ? AND accepted_at IS NULL
       ORDER BY created_at DESC`,
      [session.organization_id]
    ),
  ]);

  return NextResponse.json({
    team: members,
    pending_invitations: pendingInvites.filter(
      (inv) => new Date(inv.expires_at) > new Date()
    ),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can invite team members.' }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = validate(inviteUserSchema, body);
  if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

  const { email, name, role } = data;

  // Check plan user limit (count existing active users + pending invites)
  const orgInfo = await get<any>(
    `SELECT o.id, sp.user_limit, o.name as org_name,
            (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as actual_users
     FROM organizations o
     JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
     WHERE o.id = ?`,
    [session.organization_id]
  );

  if (orgInfo && orgInfo.actual_users >= orgInfo.user_limit) {
    return NextResponse.json(
      { error: `Team member limit of ${orgInfo.user_limit} reached on your current plan. Please upgrade to add more members.` },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists in users (active or pending) or has an open invite
  const existingUser = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
  }

  // Check for existing pending invite
  const existingInvite = await get(
    `SELECT id FROM user_invitations WHERE email = ? AND organization_id = ? AND accepted_at IS NULL AND expires_at > datetime('now')`,
    [normalizedEmail, session.organization_id]
  );
  if (existingInvite) {
    return NextResponse.json({ error: 'A pending invitation already exists for this email.' }, { status: 409 });
  }

  // Generate secure invite token
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

  await run(
    `INSERT INTO user_invitations (id, organization_id, email, name, role, token_hash, expires_at, invited_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), session.organization_id, normalizedEmail, name.trim(), role, tokenHash, expiresAt, session.id]
  );

  // Send invitation email
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
    // Invitation is still created — email can be resent
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/accept-invite?token=${rawToken}`;

  return NextResponse.json(
    {
      message: `Invitation sent to ${normalizedEmail}.`,
      invite_url: inviteUrl,
      invitation: { email: normalizedEmail, name: name.trim(), role, expires_at: expiresAt, invite_url: inviteUrl },
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can remove team members.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('id') || url.searchParams.get('user_id');

  if (!userId) return NextResponse.json({ error: 'User ID required.' }, { status: 400 });

  if (userId === session.id) {
    return NextResponse.json({ error: 'Organization Owner cannot remove themselves.' }, { status: 400 });
  }

  // Verify the user belongs to this org
  const member = await get('SELECT id FROM users WHERE id = ? AND organization_id = ?', [
    userId,
    session.organization_id,
  ]);

  if (!member) {
    return NextResponse.json({ error: 'User not found in your organization.' }, { status: 404 });
  }

  await run('DELETE FROM users WHERE id = ? AND organization_id = ?', [userId, session.organization_id]);

  return NextResponse.json({ message: 'Team member removed successfully.' });
}

// PATCH — update member role
export async function PATCH(req: NextRequest) {
  const session = await getCurrentUser(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'Organization Owner') {
    return NextResponse.json({ error: 'Only Organization Owners can change member roles.' }, { status: 403 });
  }

  const { user_id, role } = await req.json();

  if (!user_id || !role) {
    return NextResponse.json({ error: 'user_id and role are required.' }, { status: 400 });
  }

  const validRoles = ['Sales Representative', 'Marketing Manager', 'Organization Owner'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 422 });
  }

  await run(
    `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ? AND organization_id = ?`,
    [role, user_id, session.organization_id]
  );

  return NextResponse.json({ message: 'Role updated successfully.' });
}
