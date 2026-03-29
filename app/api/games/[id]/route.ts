import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { 
  getGameById, 
  getGameByInviteCode, 
  updateGame, 
  getWalletByUserId,
  lockFunds,
  unlockFunds,
  createTransaction,
  updateTransactionStatus,
  getUserById,
  getSetting,
  updateTransactionStatus as updateTxStatus
} from '@/lib/db';

const SIMULATE = process.env.SIMULATE_MPESA === 'true';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { id } = await params;
    const game = getGameById(id) || getGameByInviteCode(id);
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    const host = getUserById(game.host_id);
    const guest = game.guest_id ? getUserById(game.guest_id) : null;
    
    return NextResponse.json({
      game: {
        ...game,
        hostUsername: host?.username || 'Unknown',
        guestUsername: guest?.username || null
      }
    });
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { action } = body;
    
    const game = getGameById(id) || getGameByInviteCode(id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    if (action === 'join') {
      if (game.guest_id) {
        return NextResponse.json({ error: 'Game is full' }, { status: 400 });
      }
      
      if (game.host_id === session.userId) {
        return NextResponse.json({ error: 'Cannot join your own game' }, { status: 400 });
      }
      
      const wallet = getWalletByUserId(session.userId);
      if (!wallet || wallet.balance < game.stake) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      
      lockFunds(session.userId, game.stake);
      
      const txId = uuidv4();
      createTransaction({
        id: txId,
        user_id: session.userId,
        type: 'stake',
        amount: game.stake,
        status: SIMULATE ? 'success' : 'pending',
        reference: `GAME-${game.id.slice(0, 8)}`,
        mpesa_ref: SIMULATE ? `SIM${Date.now()}` : null,
        description: `Game stake - ${game.rounds} round(s)`
      });
      
      updateGame(game.id, {
        guest_id: session.userId,
        guest_paid: 1,
        status: 'payment_pending'
      });
      
      const updatedGame = getGameById(game.id);
      return NextResponse.json({ game: updatedGame, message: 'Joined game', joined: true });
    }
    
    if (action === 'start') {
      if (game.host_id !== session.userId) {
        return NextResponse.json({ error: 'Only host can start' }, { status: 403 });
      }
      
      if (!game.guest_id || !game.guest_paid) {
        return NextResponse.json({ error: 'Waiting for opponent payment' }, { status: 400 });
      }
      
      updateGame(game.id, { status: 'ready' });
      
      const updatedGame = getGameById(game.id);
      return NextResponse.json({ game: updatedGame, message: 'Game ready' });
    }
    
    if (action === 'cancel') {
      if (game.host_id !== session.userId && game.guest_id !== session.userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      
      if (game.status === 'playing') {
        return NextResponse.json({ error: 'Cannot cancel during game' }, { status: 400 });
      }
      
      unlockFunds(game.host_id, game.stake);
      updateTransactionStatus(`GAME-${game.id.slice(0, 8)}`, 'refund');
      
      if (game.guest_id && game.guest_paid) {
        unlockFunds(game.guest_id, game.stake);
      }
      
      updateGame(game.id, { status: 'cancelled' });
      
      return NextResponse.json({ message: 'Game cancelled' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Game action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
