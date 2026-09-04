import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { get } from '../db/db';

const COOKIE_NAME = 'lead_rescue_session';
const isProd = process.env.NODE_ENV === 'production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProd) {
      throw new Error('JWT_SECRET environment variable is required in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    }
    // Development-only fallback — NOT for production use
    console.warn('[auth] WARNING: JWT_SECRET not set. Using insecure development fallback. Set JWT_SECRET in .env.local');
    return 'lead-rescue-ai-dev-only-insecure-fallback-do-not-use-in-production';
  }
  return secret;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  role: 'Organization Owner' | 'Marketing Manager' | 'Sales Representative';
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      organization_id: user.organization_id,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UserSession;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: NextRequest): Promise<UserSession | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get(COOKIE_NAME)?.value;
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  if (!token) return null;

  const session = verifyToken(token);
  if (!session) return null;

  // Verify user still exists and is active in the database
  const user = await get<UserSession & { status?: string }>(
    'SELECT id, email, name, organization_id, role, status FROM users WHERE id = ?',
    [session.id]
  );

  if (!user) return null;

  // Reject suspended accounts
  if (user.status === 'Suspended') return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organization_id: user.organization_id,
    role: user.role,
  };
}

export function setSessionCookie(response: Response, token: string) {
  const cookieFlags = isProd
    ? `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    : `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;

  response.headers.append('Set-Cookie', cookieFlags);
}

export function clearSessionCookie(response: Response) {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function enforceRole(user: UserSession, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}
