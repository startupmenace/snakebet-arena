import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWalletByUserId, getTransactionsByUserId, getUserById } from '@/lib/db';

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
    
    const wallet = getWalletByUserId(session.userId);
    const transactions = getTransactionsByUserId(session.userId);
    const user = getUserById(session.userId);
    
    return NextResponse.json({
      wallet: wallet ? {
        balance: wallet.balance,
        lockedBalance: wallet.locked_balance
      } : null,
      transactions,
      phone: user?.phone
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet', wallet: null, transactions: [], phone: null },
      { status: 500 }
    );
  }
}
