import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getWalletByUserId, createTransaction, getUserById, deductBalance } from '@/lib/db';
import { initiateB2C } from '@/lib/mpesa';

const SIMULATE = process.env.SIMULATE_MPESA === 'true';

const withdrawSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal is KES 100').max(50000, 'Maximum withdrawal is KES 50,000')
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const result = withdrawSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { amount } = result.data;
    const wallet = getWalletByUserId(session.userId);
    const user = getUserById(session.userId);
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }
    
    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const transactionId = uuidv4();
    
    const mpesaResult = await initiateB2C(
      user.phone,
      amount,
      transactionId,
      'SnakeBet Arena Withdrawal'
    );
    
    if (!mpesaResult || mpesaResult.ResponseCode !== '0') {
      return NextResponse.json(
        { error: 'Failed to initiate withdrawal' },
        { status: 500 }
      );
    }
    
    if (SIMULATE) {
      createTransaction({
        id: transactionId,
        user_id: session.userId,
        type: 'withdraw',
        amount,
        status: 'success',
        reference: `WDL-${Date.now()}`,
        mpesa_ref: `SIM${Date.now()}`,
        description: 'Wallet withdrawal (Simulated)'
      });
      
      deductBalance(session.userId, amount);
    } else {
      createTransaction({
        id: transactionId,
        user_id: session.userId,
        type: 'withdraw',
        amount,
        status: 'pending',
        reference: `WDL-${Date.now()}`,
        mpesa_ref: null,
        description: 'Wallet withdrawal via M-PESA'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: SIMULATE ? 'Withdrawal successful!' : 'Withdrawal initiated! You will receive a confirmation shortly.',
      transactionId,
      simulated: SIMULATE
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
