import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/db/db';
import { sendPasswordResetEmail } from '@/lib/email/mailer';
import { hashPassword } from '@/lib/auth/auth';
import { validate, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

// POST /api/v1/auth/reset-password
// Initiates password reset — generates secure token, sends email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = validate(forgotPasswordSchema, body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

    const { email } = data;

    // Always return 200 regardless of whether email exists (security: don't reveal account existence)
    const user = await get<{ id: string; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (user) {
      // Invalidate any existing reset tokens for this user
      await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

      // Generate a cryptographically secure token
      const rawToken = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await run(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), user.id, tokenHash, expiresAt]
      );

      // Send email (or log token in dev mode)
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token: rawToken,
        });
      } catch (emailErr) {
        console.error('[reset-password] Email send failed:', emailErr);
        // Don't expose email errors to client
      }
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[reset-password POST]', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/v1/auth/reset-password
// Validates token and updates password
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = validate(resetPasswordSchema, body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

    const { token, password } = data;

    // Hash the incoming token to compare against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await get<{
      id: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
    }>(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
      [tokenHash]
    );

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 });
    }

    if (resetRecord.used_at) {
      return NextResponse.json({ error: 'This reset link has already been used. Please request a new one.' }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // Update password
    const newPasswordHash = hashPassword(password);
    await run(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      [newPasswordHash, resetRecord.user_id]
    );

    // Mark token as used
    await run(
      `UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`,
      [resetRecord.id]
    );

    return NextResponse.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[reset-password PATCH]', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
