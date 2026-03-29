import { NextResponse } from 'next/server';
import { getSession, sanitizeUser } from '@/lib/auth';
import { getUserById, getWalletByUserId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const wallet = getWalletByUserId(session.userId);
    
    return NextResponse.json({
      user: sanitizeUser(user),
      wallet: wallet ? {
        balance: wallet.balance,
        lockedBalance: wallet.locked_balance
      } : null
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
