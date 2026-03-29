import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getWalletByUserId, createTransaction, getUserById, updateWalletBalance } from '@/lib/db';
import { initiateSTKPush } from '@/lib/mpesa';

const SIMULATE = process.env.SIMULATE_MPESA === 'true';

const depositSchema = z.object({
  amount: z.number().min(50, 'Minimum deposit is KES 50').max(50000, 'Maximum deposit is KES 50,000')
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
    const result = depositSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { amount } = result.data;
    const user = getUserById(session.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const transactionId = uuidv4();
    
    const mpesaResult = await initiateSTKPush(
      user.phone,
      amount,
      transactionId,
      'SnakeBet Arena Deposit'
    );
    
    if (!mpesaResult || mpesaResult.ResponseCode !== '0') {
      return NextResponse.json(
        { error: 'Failed to initiate M-PESA payment' },
        { status: 500 }
      );
    }
    
    if (SIMULATE) {
      createTransaction({
        id: transactionId,
        user_id: session.userId,
        type: 'deposit',
        amount,
        status: 'success',
        reference: `DEP-${Date.now()}`,
        mpesa_ref: `SIM${Date.now()}`,
        description: 'Wallet deposit (Simulated)'
      });
      
      updateWalletBalance(session.userId, amount);
    } else {
      createTransaction({
        id: transactionId,
        user_id: session.userId,
        type: 'deposit',
        amount,
        status: 'pending',
        reference: `DEP-${Date.now()}`,
        mpesa_ref: null,
        description: 'Wallet deposit via M-PESA'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: SIMULATE ? 'Deposit successful!' : 'Payment request sent! Check your phone.',
      checkoutRequestId: mpesaResult.CheckoutRequestID,
      transactionId,
      simulated: SIMULATE
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { error: 'Deposit failed' },
      { status: 500 }
    );
  }
}
