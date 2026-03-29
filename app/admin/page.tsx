'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import styles from './admin.module.css';

interface Stats {
  totalUsers: number;
  totalGames: number;
  totalVolume: number;
}

interface LeaderboardEntry {
  username: string;
  total_wins: number;
  total_earnings: number;
}

interface Settings {
  commission: number;
  minStake: number;
  maxStake: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mpesaSettings, setMpesaSettings] = useState({
    consumerKey: '',
    consumerSecret: '',
    shortcode: '',
    passkey: '',
    callbackUrl: ''
  });
  const [savingMpesa, setSavingMpesa] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin');
        if (!res.ok) {
          if (res.status === 403) {
            setError('Admin access required');
          } else {
            router.push('/login');
          }
          return;
        }
        
        const data = await res.json();
        setStats(data.stats);
        setLeaderboard(data.leaderboard);
        setSettings(data.settings);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleSetAdmin = async (makeAdmin: boolean) => {
    if (!newAdminEmail) return;
    
    try {
      const res = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, makeAdmin })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAdminMessage({ type: 'success', text: data.message });
        setNewAdminEmail('');
      } else {
        setAdminMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setAdminMessage({ type: 'error', text: 'Failed to update admin status' });
    }
    
    setTimeout(() => setAdminMessage(null), 5000);
  };

  const handleSaveMpesa = async () => {
    setSavingMpesa(true);
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        action: 'update_mpesa',
        ...mpesaSettings
        })
      });
      
      if (res.ok) {
        setAdminMessage({ type: 'success', text: 'M-PESA settings saved to .env.local' });
      }
    } catch (error) {
      setAdminMessage({ type: 'error', text: 'Failed to save M-PESA settings' });
    }
    
    setSavingMpesa(false);
    setTimeout(() => setAdminMessage(null), 5000);
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
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.errorState}>
          <span>🔒</span>
          <h2>{error}</h2>
          <p>You need admin privileges to access this page.</p>
          <Link href="/dashboard" className={styles.backLink}>Back to Dashboard</Link>
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
            <h1 className={styles.title}>Admin Dashboard</h1>
            <Link href="/dashboard" className={styles.backBtn}>
              ← Back to Dashboard
            </Link>
          </div>

          {adminMessage && (
            <div className={`${styles.alert} ${styles[adminMessage.type]}`}>
              {adminMessage.text}
            </div>
          )}

          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'mpesa' ? styles.active : ''}`}
              onClick={() => setActiveTab('mpesa')}
            >
              M-PESA Settings
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
              onClick={() => setActiveTab('users')}
            >
              User Management
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>👥</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats?.totalUsers || 0}</span>
                    <span className={styles.statLabel}>Total Users</span>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>🎮</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{stats?.totalGames || 0}</span>
                    <span className={styles.statLabel}>Total Games</span>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>💰</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{formatCurrency(stats?.totalVolume || 0)}</span>
                    <span className={styles.statLabel}>Total Volume</span>
                  </div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📊</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{settings?.commission || 5}%</span>
                    <span className={styles.statLabel}>Platform Commission</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Top Players</h2>
                
                {leaderboard.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No players yet</p>
                  </div>
                ) : (
                  <div className={styles.leaderboard}>
                    {leaderboard.map((entry, index) => (
                      <div key={index} className={styles.leaderboardItem}>
                        <div className={styles.rank}>#{index + 1}</div>
                        <div className={styles.playerInfo}>
                          <span className={styles.playerName}>{entry.username}</span>
                          <span className={styles.playerWins}>{entry.total_wins} wins</span>
                        </div>
                        <div className={styles.playerEarnings}>
                          {formatCurrency(entry.total_earnings)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'mpesa' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>M-PESA Daraja API Settings</h2>
              <p className={styles.sectionDesc}>
                Configure your Safaricom Daraja API credentials. These are stored in <code>.env.local</code>.
              </p>
              
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Consumer Key</label>
                  <input
                    type="text"
                    value={mpesaSettings.consumerKey}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, consumerKey: e.target.value })}
                    className={styles.input}
                    placeholder="Your M-PESA Consumer Key"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Consumer Secret</label>
                  <input
                    type="password"
                    value={mpesaSettings.consumerSecret}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, consumerSecret: e.target.value })}
                    className={styles.input}
                    placeholder="Your M-PESA Consumer Secret"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Shortcode</label>
                  <input
                    type="text"
                    value={mpesaSettings.shortcode}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, shortcode: e.target.value })}
                    className={styles.input}
                    placeholder="174379 (Sandbox) or your Business Shortcode"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Passkey</label>
                  <input
                    type="password"
                    value={mpesaSettings.passkey}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, passkey: e.target.value })}
                    className={styles.input}
                    placeholder="Your M-PESA Passkey"
                  />
                </div>
                
                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Callback URL</label>
                  <input
                    type="text"
                    value={mpesaSettings.callbackUrl}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, callbackUrl: e.target.value })}
                    className={styles.input}
                    placeholder="https://your-domain.com/api/mpesa/callback"
                  />
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button 
                  onClick={handleSaveMpesa} 
                  disabled={savingMpesa}
                  className={styles.saveBtn}
                >
                  {savingMpesa ? 'Saving...' : 'Save to .env.local'}
                </button>
              </div>
              
              <div className={styles.infoBox}>
                <h4>📋 How to get M-PESA Credentials:</h4>
                <ol>
                  <li>Go to <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer">Safaricom Developer Portal</a></li>
                  <li>Create an account or login</li>
                  <li>Create a new app to get Consumer Key & Secret</li>
                  <li>Use <strong>sandbox</strong> for testing, <strong>production</strong> for real money</li>
                  <li>Set MPESA_ENV=sandbox for testing, MPESA_ENV=production for live</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>User Management</h2>
              <p className={styles.sectionDesc}>
                Grant or revoke admin privileges for users by their email address.
              </p>
              
              <div className={styles.adminForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>User Email</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className={styles.input}
                    placeholder="user@example.com"
                  />
                </div>
                
                <div className={styles.adminActions}>
                  <button 
                    onClick={() => handleSetAdmin(true)} 
                    className={styles.makeAdminBtn}
                    disabled={!newAdminEmail}
                  >
                    Make Admin
                  </button>
                  <button 
                    onClick={() => handleSetAdmin(false)} 
                    className={styles.removeAdminBtn}
                    disabled={!newAdminEmail}
                  >
                    Remove Admin
                  </button>
                </div>
              </div>
              
              <div className={styles.infoBox}>
                <h4>⚠️ Important:</h4>
                <p>Admin users can access this dashboard, manage platform settings, and view sensitive data. Only grant admin access to trusted users.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
