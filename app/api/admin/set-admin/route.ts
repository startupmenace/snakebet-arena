import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByEmail, getUserById } from '@/lib/db';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = getUserById(session.userId);
    if (!user?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { email, makeAdmin } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const targetUser = getUserByEmail(email);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(makeAdmin ? 1 : 0, targetUser.id);
    
    return NextResponse.json({ 
      success: true, 
      message: makeAdmin ? `${targetUser.username} is now an admin` : `Admin status removed from ${targetUser.username}` 
    });
  } catch (error) {
    console.error('Set admin error:', error);
    return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 });
  }
}
