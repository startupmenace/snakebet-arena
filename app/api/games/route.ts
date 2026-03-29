import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { 
  getWaitingGames, 
  getGamesByUserId, 
  createGame, 
  getGameById, 
  getWalletByUserId, 
  updateWalletBalance, 
  lockFunds,
  unlockFunds,
  createTransaction,
  getSetting
} from '@/lib/db';

const SIMULATE = process.env.SIMULATE_MPESA === 'true';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'public';
    
    if (type === 'my') {
      const games = getGamesByUserId(session.userId);
      return NextResponse.json({ games });
    }
    
    const games = getWaitingGames();
    return NextResponse.json({ games });
  } catch (error) {
    console.error('Get games error:', error);
    return NextResponse.json(
      { error: 'Failed to get games' },
      { status: 500 }
    );
  }
}

const createGameSchema = z.object({
  stake: z.number().min(50).max(5000),
  rounds: z.number().min(1).max(7),
  mode: z.enum(['duel', 'arena']).default('duel')
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
    const result = createGameSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { stake, rounds, mode } = result.data;
    
    const wallet = getWalletByUserId(session.userId);
    if (!wallet || wallet.balance < stake) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }
    
    const gameId = uuidv4();
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();
    
    lockFunds(session.userId, stake);
    
    createTransaction({
      id: uuidv4(),
      user_id: session.userId,
      type: 'stake',
      amount: stake,
      status: SIMULATE ? 'success' : 'pending',
      reference: `GAME-${gameId.slice(0, 8)}`,
      mpesa_ref: SIMULATE ? `SIM${Date.now()}` : null,
      description: `Game stake - ${rounds} round(s)`
    });
    
    const game = createGame({
      id: gameId,
      host_id: session.userId,
      guest_id: null,
      stake,
      rounds,
      mode,
      status: 'waiting',
      host_paid: 1,
      guest_paid: 0,
      winner_id: null,
      host_score: 0,
      guest_score: 0,
      invite_code: inviteCode
    });
    
    return NextResponse.json({
      game,
      inviteLink: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/game/${inviteCode}`
    });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
