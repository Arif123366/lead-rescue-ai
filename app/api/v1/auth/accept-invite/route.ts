import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { hashPassword, createToken, setSessionCookie } from '@/lib/auth/auth';
import { validate, acceptInviteSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

// POST /api/v1/auth/accept-invite
// Accept a team invitation and set up account password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = validate(acceptInviteSchema, body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

    const { token, password, name } = data;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await get<{
      id: string;
      organization_id: string;
      email: string;
      name: string;
      role: string;
      expires_at: string;
      accepted_at: string | null;
    }>(
      'SELECT id, organization_id, email, name, role, expires_at, accepted_at FROM user_invitations WHERE token_hash = ?',
      [tokenHash]
    );

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation link.' }, { status: 400 });
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired. Please ask your organization owner to send a new one.' }, { status: 400 });
    }

    // Check if user already exists (re-invited existing user edge case)
    const existingUser = await get<{ id: string }>('SELECT id FROM users WHERE email = ?', [invitation.email]);
    if (existingUser) {
      // Just activate and update password
      const passwordHash = hashPassword(password);
      await run(
        `UPDATE users SET password_hash = ?, status = 'Active', updated_at = datetime('now') WHERE id = ?`,
        [passwordHash, existingUser.id]
      );
      await run(`UPDATE user_invitations SET accepted_at = datetime('now') WHERE id = ?`, [invitation.id]);

      return NextResponse.json({ message: 'Account activated. Please log in.' });
    }

    // Create new user account
    const userId = crypto.randomUUID();
    const finalName = name?.trim() || invitation.name;
    const passwordHash = hashPassword(password);

    await run(
      `INSERT INTO users (id, email, password_hash, name, organization_id, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [userId, invitation.email, passwordHash, finalName, invitation.organization_id, invitation.role]
    );

    // Mark invitation as accepted
    await run(`UPDATE user_invitations SET accepted_at = datetime('now') WHERE id = ?`, [invitation.id]);

    // Auto-login after accepting
    const token_jwt = createToken({
      id: userId,
      email: invitation.email,
      name: finalName,
      organization_id: invitation.organization_id,
      role: invitation.role as any,
    });

    const response = NextResponse.json({
      message: 'Invitation accepted. Welcome to Lead Rescue AI!',
      user: { id: userId, email: invitation.email, name: finalName, role: invitation.role },
    });
    setSessionCookie(response, token_jwt);
    return response;
  } catch (err) {
    console.error('[accept-invite]', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
