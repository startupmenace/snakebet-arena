import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStats, getLeaderboard, getSetting, updateSetting, getUserById, getGameById, updateGame } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = getUserById(session.userId);
    if (!user?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const stats = getStats();
    const leaderboard = getLeaderboard();
    const commission = getSetting('commission');
    const minStake = getSetting('min_stake');
    const maxStake = getSetting('max_stake');
    
    return NextResponse.json({
      stats,
      leaderboard,
      settings: {
        commission: parseFloat(commission) * 100,
        minStake: parseInt(minStake),
        maxStake: parseInt(maxStake)
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
