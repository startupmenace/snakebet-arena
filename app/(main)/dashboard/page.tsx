'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import styles from './dashboard.module.css';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

interface Wallet {
  balance: number;
  lockedBalance: number;
}

interface Game {
  id: string;
  stake: number;
  rounds: number;
  mode: string;
  status: string;
  winner_id: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        
        const userData = await userRes.json();
        setUser(userData.user);
        setWallet(userData.wallet);
        
        const gamesRes = await fetch('/api/games?type=my');
        const gamesData = await gamesRes.json();
        setGames(gamesData.games || []);
        
        const wins = gamesData.games?.filter((g: Game) => g.winner_id === userData.user.id).length || 0;
        const losses = gamesData.games?.filter((g: Game) => g.winner_id && g.winner_id !== userData.user.id).length || 0;
        
        setStats({
          wins,
          losses,
          totalEarnings: wins * (wallet?.balance || 0) * 0.95
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      waiting: { class: styles.badgeWarning, label: 'Waiting' },
      payment_pending: { class: styles.badgeWarning, label: 'Payment Pending' },
      ready: { class: styles.badgeSuccess, label: 'Ready' },
      playing: { class: styles.badgePrimary, label: 'Playing' },
      completed: { class: styles.badgeSuccess, label: 'Completed' },
      cancelled: { class: styles.badgeError, label: 'Cancelled' }
    };
    return badges[status] || badges.waiting;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.greeting}>Welcome back, {user?.username}!</h1>
              <p className={styles.subtitle}>Ready to dominate the arena?</p>
            </div>
            <Link href="/play" className={styles.playBtn}>
              <span>🎮</span> Play Now
            </Link>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.walletCard}>
              <div className={styles.walletHeader}>
                <span className={styles.walletIcon}>💰</span>
                <span className={styles.walletLabel}>Wallet Balance</span>
              </div>
              <div className={styles.walletBalance}>
                {formatCurrency(wallet?.balance || 0)}
              </div>
              {wallet?.lockedBalance ? (
                <div className={styles.lockedAmount}>
                  {formatCurrency(wallet.lockedBalance)} locked in games
                </div>
              ) : null}
              <div className={styles.walletActions}>
                <Link href="/wallet" className={styles.walletBtn}>
                  Deposit
                </Link>
                <Link href="/wallet" className={`${styles.walletBtn} ${styles.walletBtnSecondary}`}>
                  Withdraw
                </Link>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏆</div>
              <div className={styles.statValue}>{stats.wins}</div>
              <div className={styles.statLabel}>Wins</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>💀</div>
              <div className={styles.statValue}>{stats.losses}</div>
              <div className={styles.statLabel}>Losses</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={`${styles.statValue} ${styles.earnings}`}>
                {formatCurrency(stats.totalEarnings)}
              </div>
              <div className={styles.statLabel}>Total Earnings</div>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Matches</h2>
                <Link href="/play" className={styles.viewAll}>View All</Link>
              </div>
              
              {games.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🎮</span>
                  <h3>No games yet</h3>
                  <p>Start playing to see your match history here</p>
                  <Link href="/play" className={styles.playLink}>
                    Find a Match
                  </Link>
                </div>
              ) : (
                <div className={styles.gamesList}>
                  {games.slice(0, 5).map((game) => {
                    const statusBadge = getStatusBadge(game.status);
                    const isWinner = game.winner_id === user?.id;
                    const isPlayed = game.status === 'completed';
                    
                    return (
                      <div key={game.id} className={styles.gameItem}>
                        <div className={styles.gameInfo}>
                          <div className={styles.gameStake}>
                            Stake: {formatCurrency(game.stake)}
                          </div>
                          <div className={styles.gameMeta}>
                            {game.rounds} round{game.rounds > 1 ? 's' : ''} • {game.mode}
                          </div>
                        </div>
                        <div className={styles.gameRight}>
                          {isPlayed && (
                            <div className={`${styles.gameResult} ${isWinner ? styles.win : styles.loss}`}>
                              {isWinner ? 'Won' : 'Lost'}
                            </div>
                          )}
                          <span className={`${styles.badge} ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
              </div>
              
              <div className={styles.quickActions}>
                <Link href="/play" className={styles.actionCard}>
                  <span className={styles.actionIcon}>🎮</span>
                  <span className={styles.actionTitle}>Find Match</span>
                  <span className={styles.actionDesc}>Join a public game</span>
                </Link>
                
                <Link href="/play?create=true" className={styles.actionCard}>
                  <span className={styles.actionIcon}>➕</span>
                  <span className={styles.actionTitle}>Create Game</span>
                  <span className={styles.actionDesc}>Set your own stakes</span>
                </Link>
                
                <Link href="/wallet" className={styles.actionCard}>
                  <span className={styles.actionIcon}>💳</span>
                  <span className={styles.actionTitle}>Deposit</span>
                  <span className={styles.actionDesc}>Add funds via M-PESA</span>
                </Link>
                
                <Link href="/profile" className={styles.actionCard}>
                  <span className={styles.actionIcon}>👤</span>
                  <span className={styles.actionTitle}>Profile</span>
                  <span className={styles.actionDesc}>View stats & settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
