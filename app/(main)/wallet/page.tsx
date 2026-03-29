'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import styles from './wallet.module.css';

interface Wallet {
  balance: number;
  lockedBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string | null;
  description: string | null;
  created_at: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        
        const walletRes = await fetch('/api/wallet');
        const walletData = await walletRes.json();
        setWallet(walletData.wallet);
        setPhone(walletData.phone || '');
        setTransactions(Array.isArray(walletData.transactions) ? walletData.transactions : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    
    fetchData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setMpesaLoading(true);
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      setMpesaLoading(false);
      return;
    }
    
    if (action === 'deposit' && numAmount < 50) {
      setMessage({ type: 'error', text: 'Minimum deposit is KES 50' });
      setMpesaLoading(false);
      return;
    }
    
    if (action === 'withdraw' && numAmount < 100) {
      setMessage({ type: 'error', text: 'Minimum withdrawal is KES 100' });
      setMpesaLoading(false);
      return;
    }
    
    if (action === 'withdraw' && wallet && numAmount > wallet.balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      setMpesaLoading(false);
      return;
    }
    
    try {
      const endpoint = action === 'deposit' ? '/api/wallet/deposit' : '/api/wallet/withdraw';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Transaction failed' });
        setMpesaLoading(false);
        return;
      }
      
      setMessage({ 
        type: 'success', 
        text: action === 'deposit' 
          ? 'Payment request sent! Check your phone to complete payment.' 
          : 'Withdrawal initiated! You will receive a confirmation shortly.'
      });
      
      setAmount('');
      
      const walletRes = await fetch('/api/wallet');
      const walletData = await walletRes.json();
      setWallet(walletData.wallet);
      setTransactions(walletData.transactions || []);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setMpesaLoading(false);
    }
  };

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

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      deposit: '💰',
      withdraw: '💸',
      stake: '🎮',
      win: '🏆',
      refund: '↩️',
      commission: '💼'
    };
    return icons[type] || '💱';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: styles.statusPending,
      success: styles.statusSuccess,
      failed: styles.statusFailed
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className={styles.page}>
      <Navbar />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Wallet</h1>
          
          <div className={styles.grid}>
            <div className={styles.leftColumn}>
              <div className={styles.balanceCard}>
                <div className={styles.balanceHeader}>
                  <span className={styles.balanceIcon}>💰</span>
                  <span className={styles.balanceLabel}>Available Balance</span>
                </div>
                <div className={styles.balanceAmount}>
                  {formatCurrency(wallet?.balance || 0)}
                </div>
                {wallet?.lockedBalance ? (
                  <div className={styles.lockedInfo}>
                    <span>🔒</span>
                    <span>{formatCurrency(wallet.lockedBalance)} locked in active games</span>
                  </div>
                ) : null}
              </div>

              <div className={styles.actionCard}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${action === 'deposit' ? styles.tabActive : ''}`}
                    onClick={() => setAction('deposit')}
                  >
                    Deposit
                  </button>
                  <button
                    className={`${styles.tab} ${action === 'withdraw' ? styles.tabActive : ''}`}
                    onClick={() => setAction('withdraw')}
                  >
                    Withdraw
                  </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  {message && (
                    <div className={`${styles.message} ${styles[message.type]}`}>
                      {message.text}
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Amount (KES)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={styles.input}
                      placeholder={action === 'deposit' ? 'Min: 50' : 'Min: 100'}
                      min={action === 'deposit' ? 50 : 100}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      readOnly
                      className={`${styles.input} ${styles.readOnly}`}
                      placeholder="Your M-PESA number"
                    />
                    <span className={styles.hint}>This is your registered M-PESA number</span>
                  </div>

                  <button
                    type="submit"
                    disabled={mpesaLoading}
                    className={styles.submitBtn}
                  >
                    {mpesaLoading ? (
                      'Processing...'
                    ) : action === 'deposit' ? (
                      <>Pay via M-PESA</>
                    ) : (
                      <>Withdraw via M-PESA</>
                    )}
                  </button>

                  <div className={styles.securityNote}>
                    <span>🔒</span>
                    <span>Secure payments via Safaricom M-PESA</span>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.transactionsCard}>
                <h2 className={styles.transactionsTitle}>Transaction History</h2>
                
                {transactions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span>📜</span>
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className={styles.transactionsList}>
                    {transactions.map((tx) => (
                      <div key={tx.id} className={styles.transaction}>
                        <div className={styles.txIcon}>
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className={styles.txInfo}>
                          <div className={styles.txType}>
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </div>
                          <div className={styles.txMeta}>
                            {tx.reference && <span>{tx.reference}</span>}
                            <span>{formatDate(tx.created_at)}</span>
                          </div>
                        </div>
                        <div className={styles.txRight}>
                          <div className={`${styles.txAmount} ${styles[tx.type]}`}>
                            {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </div>
                          <span className={`${styles.txStatus} ${getStatusColor(tx.status)}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
