import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginOrCreateGoogleUser } from '@/lib/auth';

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
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const origin = getOAuthOrigin(req);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Google authentication was cancelled: ' + error)}`, origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/login?error=Invalid+Google+authorization+response', origin)
    );
  }

  // Validate anti-CSRF state parameter
  const cookieStore = await cookies();
  const savedState = cookieStore.get('nitp_google_oauth_state')?.value;
  cookieStore.delete('nitp_google_oauth_state');

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/login?error=Security+validation+failed+(CSRF+mismatch).+Please+try+again.', origin)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/login?error=google_not_configured', origin)
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('[Google OAuth] Token exchange failed:', errData);
      return NextResponse.redirect(
        new URL('/login?error=Failed+to+exchange+Google+authorization+code', origin)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(
        new URL('/login?error=Failed+to+retrieve+Google+user+profile', origin)
      );
    }

    const profile = await profileRes.json();
    const { email, name, sub } = profile;

    if (!email) {
      return NextResponse.redirect(
        new URL('/login?error=No+email+address+associated+with+Google+account', origin)
      );
    }

    // 3. Authenticate Google user and set session cookie (no self-signup)
    const result = await loginOrCreateGoogleUser({
      email,
      name: name || email.split('@')[0],
      sub,
      picture: profile.picture,
    });

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`, origin)
      );
    }

    return NextResponse.redirect(new URL('/dashboard', origin));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown OAuth error';
    console.error('[Google OAuth Exception]:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}
