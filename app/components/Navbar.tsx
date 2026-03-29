'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

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

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setWallet(data.wallet);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🐍</span>
          <span className={styles.logoText}>SnakeBet</span>
          <span className={styles.logoAccent}>Arena</span>
        </Link>

        <div className={styles.navLinks}>
          {user ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
              <Link href="/play" className={styles.navLink}>Play</Link>
              <Link href="/wallet" className={styles.navLink}>Wallet</Link>
              
              <div className={styles.walletBadge}>
                <span className={styles.walletIcon}>💰</span>
                <span className={styles.walletBalance}>{formatCurrency(wallet?.balance || 0)}</span>
                {wallet?.lockedBalance ? (
                  <span className={styles.lockedBalance}>({formatCurrency(wallet.lockedBalance)} locked)</span>
                ) : null}
              </div>

              <div className={styles.profileMenu}>
                <button 
                  className={styles.profileBtn}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className={styles.avatar}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </button>
                
                {menuOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                      <span className={styles.username}>{user.username}</span>
                      <span className={styles.email}>{user.email}</span>
                    </div>
                    <Link href="/profile" className={styles.dropdownItem}>Profile</Link>
                    <Link href="/wallet" className={styles.dropdownItem}>Wallet</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>Login</Link>
              <Link href="/register" className={`${styles.navLink} ${styles.navLinkCta}`}>Sign Up</Link>
            </>
          )}
        </div>

        <button 
          className={styles.mobileMenuBtn}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
