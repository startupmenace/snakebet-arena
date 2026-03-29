import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getUserByEmail, getUserByPhone, getUserByUsername, createUser } from '@/lib/db';
import { createToken, setAuthCookie, sanitizeUser } from '@/lib/auth';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters'),
  phone: z.string().regex(/^(\+254|254|0)[17][0-9]{8}$/, 'Invalid Kenyan phone number')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password, username, phone } = result.data;
    
    if (getUserByEmail(email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    if (getUserByUsername(username)) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }
    
    if (getUserByPhone(phone)) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    
    const user = createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      username,
      phone,
      avatar: '/avatars/default.png',
      is_admin: 0
    });
    
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: false
    });
    
    const cookie = setAuthCookie(token);
    const response = NextResponse.json({
      user: sanitizeUser(user),
      message: 'Registration successful'
    });
    
    response.cookies.set(cookie);
    
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json(
        { error: 'Email, username, or phone already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
