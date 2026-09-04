import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db/db';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth/auth';
import { validate, loginSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = validate(loginSchema, body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid request' }, { status: 422 });

    const { email, password } = data;

    const user = await get<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      organization_id: string;
      role: string;
      status: string;
    }>('SELECT id, email, name, password_hash, organization_id, role, status FROM users WHERE email = ?', [
      email.toLowerCase(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status === 'Suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    if (user.status === 'Pending') {
      return NextResponse.json(
        { error: 'Your account is pending. Please accept the invitation email sent to you.' },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      organization_id: user.organization_id,
      role: user.role as any,
    });

    const response = NextResponse.json({
      message: 'Login successful.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
