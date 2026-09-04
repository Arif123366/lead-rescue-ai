import { NextRequest, NextResponse } from 'next/server';

// Routes that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
];

const PUBLIC_API_PREFIXES = [
  '/api/v1/auth/',
  '/api/v1/webhooks/',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '?'))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = req.cookies.get('lead_rescue_session')?.value;

  if (!token) {
    // API calls → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page requests → redirect to login
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
