import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { queryOne, execute } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nitp-scheduler-ultra-secure-key-2026-production'
);

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
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
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

  const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
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
