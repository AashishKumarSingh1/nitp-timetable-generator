import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getOAuthOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');

  if (host.includes('0.0.0.0') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '3010';
    return `http://localhost:${port}`;
  }

  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Quick config status check endpoint
  if (searchParams.get('check') === '1') {
    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    return NextResponse.json({ configured: isConfigured });
  }

  // If accessed via 0.0.0.0 or 127.0.0.1, redirect to localhost before initiating OAuth handshake
  // to ensure CSRF state cookies and redirect URIs strictly match Google's registered origins.
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  if (host.includes('0.0.0.0') || host.includes('127.0.0.1')) {
    const port = host.split(':')[1] || '3010';
    return NextResponse.redirect(`http://localhost:${port}/api/auth/google`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  // Determine application redirect URI dynamically from request origin
  const origin = getOAuthOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Cryptographically secure anti-CSRF state token
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('nitp_google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(googleAuthUrl);
}
