'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import styles from './profile.module.css';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  created_at: string;
}

interface Game {
  id: string;
  stake: number;
  rounds: number;
  status: string;
  winner_id: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
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
        
        const gamesRes = await fetch('/api/games?type=my');
        const gamesData = await gamesRes.json();
        setGames(gamesData.games || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const stats = {
    totalGames: games.length,
    wins: games.filter(g => g.winner_id === user?.id).length,
    losses: games.filter(g => g.winner_id && g.winner_id !== user?.id).length,
    winRate: games.length > 0 ? Math.round((games.filter(g => g.winner_id === user?.id).length / games.length) * 100) : 0
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarLarge}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.username}>{user?.username}</h1>
              <p className={styles.email}>{user?.email}</p>
              <p className={styles.phone}>{user?.phone}</p>
              <p className={styles.memberSince}>
                Member since {formatDate(user?.created_at || '')}
              </p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.totalGames}</span>
              <span className={styles.statLabel}>Total Games</span>
            </div>
            <div className={`${styles.statCard} ${styles.wins}`}>
              <span className={styles.statValue}>{stats.wins}</span>
              <span className={styles.statLabel}>Wins</span>
            </div>
            <div className={`${styles.statCard} ${styles.losses}`}>
              <span className={styles.statValue}>{stats.losses}</span>
              <span className={styles.statLabel}>Losses</span>
            </div>
            <div className={`${styles.statCard} ${styles.winRate}`}>
              <span className={styles.statValue}>{stats.winRate}%</span>
              <span className={styles.statLabel}>Win Rate</span>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Match History</h2>
            
            {games.length === 0 ? (
              <div className={styles.emptyState}>
                <span>📊</span>
                <p>No matches played yet</p>
                <Link href="/play" className={styles.playLink}>Find a Match</Link>
              </div>
            ) : (
              <div className={styles.gamesList}>
                {games.map((game) => {
                  const isWinner = game.winner_id === user?.id;
                  const isPlayed = game.status === 'completed';
                  
                  return (
                    <div key={game.id} className={styles.gameItem}>
                      <div className={styles.gameDate}>
                        {formatDate(game.created_at)}
                      </div>
                      <div className={styles.gameDetails}>
                        <span className={styles.gameStake}>
                          {formatCurrency(game.stake)}
                        </span>
                        <span className={styles.gameRounds}>
                          {game.rounds} round{game.rounds > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className={styles.gameResult}>
                        {isPlayed ? (
                          <span className={`${styles.resultBadge} ${isWinner ? styles.win : styles.loss}`}>
                            {isWinner ? 'WIN' : 'LOSS'}
                          </span>
                        ) : (
                          <span className={`${styles.resultBadge} ${styles.pending}`}>
                            {game.status.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
