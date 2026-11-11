import { SignJWT, jwtVerify } from 'jose';
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

// Flag to bypass login for rapid testing and development (false in production)
export const BYPASS_AUTH = false;

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

  // Fallback bypass only if explicitly enabled
  if (BYPASS_AUTH) {
    return DEFAULT_BYPASS_USER;
  }

  return null;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
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

/**
 * Institutional Google Workspace Authentication
 * Strict whitelist-based access:
 * - Allows login ONLY if email exists in `users` or `faculty` table.
 * - Self-signup is strictly disabled.
 */
export async function authenticateGoogleUser(googleProfile: {
  email: string;
  name: string;
  sub?: string;
  picture?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const email = googleProfile.email.toLowerCase().trim();

  // 1. Check existing registered users
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

    // Update metadata if columns exist
    try {
      await execute(
        'UPDATE users SET google_id = COALESCE(?, google_id), avatar_url = COALESCE(?, avatar_url), last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [googleProfile.sub || null, googleProfile.picture || null, existing.id]
      );
    } catch {
      // ignore metadata update error
    }
  } else {
    // 2. Check if the user is a registered faculty member in the academic directory
    const faculty = await queryOne<{
      id: string;
      name: string;
      email: string;
    }>('SELECT id, name, email FROM faculty WHERE LOWER(email) = ?', [email]);

    if (!faculty) {
      // 3. Reject unauthorized Google accounts (NO SIGNUP ALLOWED)
      return {
        success: false,
        error: `Access Denied: The Google account (${email}) is not registered. Self-registration is disabled. Please contact the administrator.`,
      };
    }

    // Auto-link registered faculty to users table
    const userId = 'usr_' + faculty.id;
    try {
      await execute(
        'INSERT INTO users (id, email, name, role, google_id, avatar_url, last_login) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, email, faculty.name, 'FACULTY', googleProfile.sub || null, googleProfile.picture || null]
      );
    } catch {
      // fallback if already inserted
    }

    authUser = {
      id: userId,
      email,
      name: faculty.name,
      role: 'FACULTY',
    };
  }

  const token = await signSessionToken(authUser);
  await setSessionCookie(token);

  return { success: true, user: authUser };
}

// Backward-compatible alias for existing callers
export const loginOrCreateGoogleUser = authenticateGoogleUser;

