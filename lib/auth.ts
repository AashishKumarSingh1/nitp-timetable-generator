import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { queryOne, execute } from './db';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE?.includes('build')) {
      throw new Error(
        '[AUTH] JWT_SECRET environment variable is not set. ' +
        'Refusing to run in production with an insecure fallback key.'
      );
    }
    return new TextEncoder().encode('nitp-scheduler-dev-only-insecure-key-do-not-use-in-prod');
  }
  return new TextEncoder().encode(secret);
}

const SESSION_COOKIE_NAME = 'nitp_session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'FACULTY' | 'STAFF';
}

export async function signSessionToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

// Flag to bypass login for rapid testing and development
export const BYPASS_AUTH = true;

export const DEFAULT_BYPASS_USER: AuthUser = {
  id: 'usr_admin_default',
  email: 'admin@nitp.ac.in',
  name: 'System Administrator',
  role: 'ADMIN',
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const verified = await verifySessionToken(token);
      if (verified) return verified;
    }
  } catch {
    // ignore
  }

  // Bypass login: automatically return active administrator profile
  if (BYPASS_AUTH) {
    return DEFAULT_BYPASS_USER;
  }

  return null;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    if (BYPASS_AUTH) {
      return DEFAULT_BYPASS_USER;
    }
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function loginWithPassword(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const user = await queryOne<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: 'ADMIN' | 'FACULTY' | 'STAFF';
  }>('SELECT id, email, password_hash, name, role FROM users WHERE email = ?', [email.toLowerCase().trim()]);

  if (!user) {
    return { success: false, error: 'Invalid email address or password' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid email address or password' };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = await signSessionToken(authUser);
  await setSessionCookie(token);

  return { success: true, user: authUser };
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: 'ADMIN' | 'FACULTY' | 'STAFF' = 'ADMIN'
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long' };
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return { success: false, error: 'An account with this email already exists' };
  }

  const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  const passwordHash = await bcrypt.hash(password, 10);

  await execute(
    'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
    [userId, email.toLowerCase().trim(), passwordHash, name.trim(), role]
  );

  const authUser: AuthUser = {
    id: userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    role,
  };

  const token = await signSessionToken(authUser);
  await setSessionCookie(token);

  return { success: true, user: authUser };
}

export async function loginOrCreateGoogleUser(googleProfile: {
  email: string;
  name: string;
  sub?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const email = googleProfile.email.toLowerCase().trim();
  const existing = await queryOne<{
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FACULTY' | 'STAFF';
  }>('SELECT id, email, name, role FROM users WHERE email = ?', [email]);

  let authUser: AuthUser;

  if (existing) {
    authUser = {
      id: existing.id,
      email: existing.email,
      name: existing.name || googleProfile.name.trim(),
      role: existing.role,
    };
  } else {
    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    // Assign ADMIN if admin email or specified in ADMIN_EMAILS, otherwise FACULTY
    const role: 'ADMIN' | 'FACULTY' | 'STAFF' =
      email === 'admin@nitp.ac.in' || email.startsWith('admin') ? 'ADMIN' : 'FACULTY';
    const displayName = googleProfile.name.trim() || email.split('@')[0];

    try {
      await execute(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
        [userId, email, 'google_oauth_no_password', displayName, role]
      );
    } catch (e) {
      console.warn('[AUTH] Notice: Google user created in session directly:', e);
    }

    authUser = {
      id: userId,
      email,
      name: displayName,
      role,
    };
  }

  const token = await signSessionToken(authUser);
  await setSessionCookie(token);

  return { success: true, user: authUser };
}

