import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { User } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-only'
);

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function getSessionFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export function setAuthCookie(token: string): { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'strict'; path: string; maxAge: number } {
  return {
    name: 'auth_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  };
}

export function clearAuthCookie(): { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'strict'; path: string; maxAge: number } {
  return {
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  };
}

export function sanitizeUser(user: User): Omit<User, 'password_hash'> {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
