'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import styles from './play.module.css';

interface Game {
  id: string;
  host_id: string;
  stake: number;
  rounds: number;
  mode: string;
  status: string;
  invite_code: string;
  hostUsername: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
}

function PlayContent() {
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [stake, setStake] = useState('100');
  const [rounds, setRounds] = useState('1');
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreate(true);
    }
    
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
        
        const gamesRes = await fetch('/api/games');
        const gamesData = await gamesRes.json();
        setGames(gamesData.games || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router, searchParams]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stake: parseFloat(stake),
          rounds: parseInt(rounds),
          mode: 'duel'
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create game' });
        setCreating(false);
        return;
      }
      
      setInviteLink(data.inviteLink);
      
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      setWallet(userData.wallet);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!wallet || wallet.balance < games.find(g => g.id === gameId)?.stake!) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }
    
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to join game' });
        return;
      }
      
      router.push(`/game/${gameId}`);
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong' });
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setMessage({ type: 'success', text: 'Invite link copied!' });
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE')}`;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading arena...</p>
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
              <h1 className={styles.title}>Game Arena</h1>
              <p className={styles.subtitle}>Find opponents or create your own match</p>
            </div>
            <button 
              onClick={() => setShowCreate(!showCreate)}
              className={styles.createBtn}
            >
              {showCreate ? 'Cancel' : '+ Create Game'}
            </button>
          </div>

          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {showCreate && !inviteLink && (
            <div className={styles.createCard}>
              <h2>Create New Game</h2>
              <form onSubmit={handleCreateGame} className={styles.createForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Stake Amount (KES)</label>
                  <div className={styles.stakeInput}>
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      min={50}
                      max={5000}
                      className={styles.input}
                    />
                    <span className={styles.stakeHint}>Min: 50 | Max: 5,000</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Number of Rounds</label>
                  <div className={styles.roundsSelector}>
                    {['1', '3', '5', '7'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`${styles.roundBtn} ${rounds === r ? styles.roundBtnActive : ''}`}
                        onClick={() => setRounds(r)}
                      >
                        {r === '1' ? 'Single' : `Best of ${r}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.potPreview}>
                  <span>Potential Pot:</span>
                  <span className={styles.potAmount}>{formatCurrency(parseFloat(stake) * 2)}</span>
                </div>

                <button
                  type="submit"
                  disabled={creating || !!(wallet && wallet.balance < parseFloat(stake))}
                  className={styles.submitBtn}
                >
                  {creating ? 'Creating...' : 'Create & Get Invite Link'}
                </button>

                {wallet && wallet.balance < parseFloat(stake) && (
                  <p className={styles.balanceWarning}>
                    Insufficient balance. <Link href="/wallet">Deposit funds</Link>
                  </p>
                )}
              </form>
            </div>
          )}

          {inviteLink && (
            <div className={styles.inviteCard}>
              <div className={styles.inviteIcon}>🔗</div>
              <h2>Game Created!</h2>
              <p>Share this link with your opponent:</p>
              <div className={styles.inviteLinkBox}>
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className={styles.inviteLinkInput}
                />
                <button onClick={copyInviteLink} className={styles.copyBtn}>
                  Copy
                </button>
              </div>
              <p className={styles.waitingNote}>
                Waiting for opponent to join...
              </p>
            </div>
          )}

          <div className={styles.gamesSection}>
            <h2 className={styles.sectionTitle}>Public Games</h2>
            
            {games.length === 0 ? (
              <div className={styles.emptyState}>
                <span>🎮</span>
                <h3>No games available</h3>
                <p>Be the first to create a game!</p>
              </div>
            ) : (
              <div className={styles.gamesGrid}>
                {games.map((game) => (
                  <div key={game.id} className={styles.gameCard}>
                    <div className={styles.gameHeader}>
                      <div className={styles.playerInfo}>
                        <div className={styles.avatar}>
                          {game.hostUsername?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.playerName}>{game.hostUsername}</div>
                          <div className={styles.playerLabel}>Host</div>
                        </div>
                      </div>
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        Waiting
                      </span>
                    </div>
                    
                    <div className={styles.gameDetails}>
                      <div className={styles.detail}>
                        <span className={styles.detailLabel}>Stake</span>
                        <span className={styles.detailValue}>{formatCurrency(game.stake)}</span>
                      </div>
                      <div className={styles.detail}>
                        <span className={styles.detailLabel}>Rounds</span>
                        <span className={styles.detailValue}>{game.rounds}</span>
                      </div>
                      <div className={styles.detail}>
                        <span className={styles.detailLabel}>Mode</span>
                        <span className={styles.detailValue}>{game.mode}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={!!(wallet && wallet.balance < game.stake)}
                      className={styles.joinBtn}
                    >
                      {wallet && wallet.balance < game.stake ? 'Insufficient Balance' : 'Join Game'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading arena...</p>
        </div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
