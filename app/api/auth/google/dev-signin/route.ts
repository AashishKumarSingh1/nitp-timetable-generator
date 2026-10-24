import { NextRequest, NextResponse } from 'next/server';
import { loginOrCreateGoogleUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Developer convenience: instant simulated Google Workspace sign-in when developing locally
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_GOOGLE_LOGIN !== 'true') {
    return NextResponse.json(
      { error: 'Developer sign-in is disabled in production environments.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'admin@nitp.ac.in';
    const name = body.name || 'NIT Patna Administrator';

    const result = await loginOrCreateGoogleUser({
      email,
      name,
      sub: 'dev_google_' + crypto.randomUUID().slice(0, 8),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Dev signin failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
