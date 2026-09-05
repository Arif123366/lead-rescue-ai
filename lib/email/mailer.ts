/**
 * lib/email/mailer.ts
 *
 * Transactional email service using Resend.
 * - In production: sends real emails via Resend API (requires RESEND_API_KEY)
 * - In development: logs email details + token URLs to console
 */

const APP_URL = process.env.APP_URL || 'https://leadrescueai.xilxil.com';
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.RESEND_FROM_DOMAIN || 'Lead Rescue AI <notifications@leadrescue.ai>';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Lead Rescue AI <notifications@leadrescue.ai>';

  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[mailer] Resend warning/error:', err);

      // If sandbox restriction (can only send to verified email in free tier)
      if (res.status === 403 || (err as any)?.statusCode === 403) {
        console.log('[mailer] Resend Sandbox Restriction — Invitation link generated cleanly for direct sharing.');
        const urlMatch = payload.html.match(/href="([^"]+)"/);
        if (urlMatch) {
          console.log('[mailer] ACTION URL:', urlMatch[1]);
        }
        return;
      }

      throw new Error(`Email send failed: ${(err as any)?.message || res.statusText}`);
    }

    const data = await res.json();
    console.log('[mailer] Email sent via Resend:', data.id);
  } else {
    // Development mode — print to console
    console.log('\n─────────────────────────────────────────');
    console.log('[mailer] DEV MODE — Email not sent (RESEND_API_KEY not configured)');
    console.log(`  From:    ${fromEmail}`);
    console.log(`  To:      ${payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log('─────────────────────────────────────────\n');
    // Extract any URL from the HTML for easy testing
    const urlMatch = payload.html.match(/href="([^"]+)"/);
    if (urlMatch) {
      console.log('[mailer] ACTION URL:', urlMatch[1]);
      console.log('─────────────────────────────────────────\n');
    }
  }
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${opts.token}`;

  await sendEmail({
    to: opts.to,
    subject: 'Reset your Lead Rescue AI password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Password Reset</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:0 16px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:12px;padding:12px 20px;">
          <span style="color:#fff;font-size:20px;font-weight:900;">🔥 Lead Rescue AI</span>
        </div>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Reset Your Password</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi ${opts.name}, we received a request to reset the password for your Lead Rescue AI account.
        Click the button below to set a new password.
      </p>
      <a href="${resetUrl}"
         style="display:block;background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;text-align:center;
                padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:24px;">
        Reset Password
      </a>
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;">
        This link expires in <strong style="color:#94a3b8">1 hour</strong>.
        If you did not request a password reset, please ignore this email — your account is safe.
      </p>
      <p style="color:#475569;font-size:11px;margin:0;word-break:break-all;">
        Or copy this URL: ${resetUrl}
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ── Team Invitation ───────────────────────────────────────────────────────────

export async function sendUserInviteEmail(opts: {
  to: string;
  name: string;
  token: string;
  organizationName: string;
  inviterName: string;
  role: string;
}): Promise<void> {
  const acceptUrl = `${APP_URL}/accept-invite?token=${opts.token}`;

  await sendEmail({
    to: opts.to,
    subject: `You've been invited to join ${opts.organizationName} on Lead Rescue AI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Team Invitation</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:0 16px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:12px;padding:12px 20px;">
          <span style="color:#fff;font-size:20px;font-weight:900;">🔥 Lead Rescue AI</span>
        </div>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">You're Invited!</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hi ${opts.name}, <strong style="color:#e2e8f0">${opts.inviterName}</strong> has invited you to join
        <strong style="color:#e2e8f0">${opts.organizationName}</strong> on Lead Rescue AI as a
        <strong style="color:#f43f5e">${opts.role}</strong>.
      </p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
        Click the button below to accept the invitation and set up your account.
      </p>
      <a href="${acceptUrl}"
         style="display:block;background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;text-align:center;
                padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:24px;">
        Accept Invitation &amp; Set Password
      </a>
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;">
        This invitation expires in <strong style="color:#94a3b8">48 hours</strong>.
      </p>
      <p style="color:#475569;font-size:11px;margin:0;word-break:break-all;">
        Or copy this URL: ${acceptUrl}
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ── Follow-Up Email ───────────────────────────────────────────────────────────

export async function sendFollowUpEmail(opts: {
  to: string;
  subject: string;
  body: string;
  organizationName: string;
}): Promise<void> {
  const unsubscribeText = 'If you wish to unsubscribe from further communications, please reply with "STOP".';

  await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${opts.subject}</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;">
      <div style="margin-bottom:24px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#f43f5e,#e11d48);border-radius:10px;padding:8px 16px;">
          <span style="color:#fff;font-size:14px;font-weight:800;">🔥 Lead Rescue AI</span>
        </div>
      </div>
      <div style="color:#e2e8f0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${opts.body}</div>
      <hr style="border:none;border-top:1px solid #334155;margin:32px 0;">
      <p style="color:#475569;font-size:11px;margin:0;">
        Sent on behalf of <strong style="color:#64748b">${opts.organizationName}</strong> via Lead Rescue AI.
        ${unsubscribeText}
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
