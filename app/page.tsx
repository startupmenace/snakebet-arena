'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface SnakeSegment {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
}

const GRID_SIZE = 30;
const CELL_SIZE = 12;

export default function LandingPage() {
  const [snake, setSnake] = useState<SnakeSegment[]>([{ x: 15, y: 15 }]);
  const [food, setFood] = useState<Food>({ x: 10, y: 10 });
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': setDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': setDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': setDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': setDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSnake(prev => {
        const head = { x: prev[0].x + direction.x, y: prev[0].y + direction.y };
        
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          return prev;
        }
        
        for (let i = 1; i < prev.length; i++) {
          if (head.x === prev[i].x && head.y === prev[i].y) {
            return prev;
          }
        }
        
        const newSnake = [head, ...prev];
        
        if (head.x === food.x && head.y === food.y) {
          setFood({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          });
        } else {
          newSnake.pop();
        }
        
        return newSnake;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [direction, food]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(255, 78, 205, 0.1)';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }
    
    snake.forEach((segment, index) => {
      const gradient = ctx.createRadialGradient(
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, index === 0 ? '#39ff14' : '#2ecc0f');
      gradient.addColorStop(1, index === 0 ? '#2ecc0f' : '#1a8a0a');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        3
      );
      ctx.fill();
      
      if (index === 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
          segment.x * CELL_SIZE + CELL_SIZE / 3,
          segment.y * CELL_SIZE + CELL_SIZE / 3,
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });
    
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 78, 205, ${pulse})`;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
  }, [snake, food]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🐍</span>
            <span className={styles.logoText}>SnakeBet</span>
            <span className={styles.logoAccent}>Arena</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/login" className={styles.navLink}>Login</Link>
            <Link href="/register" className={styles.navBtn}>Sign Up</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.badge}>M-PESA Powered</div>
              <h1 className={styles.title}>
                Bet on Your <br />
                <span className={styles.titleGradient}>Snake Skills</span>
              </h1>
              <p className={styles.subtitle}>
                Compete head-to-head in real-time multiplayer Snake games.
                Set your stake, beat your opponent, win real money.
              </p>
              <div className={styles.cta}>
                <Link href="/register" className={styles.btnPrimary}>
                  Start Playing
                  <span className={styles.btnArrow}>→</span>
                </Link>
                <Link href="#how-it-works" className={styles.btnSecondary}>
                  How It Works
                </Link>
              </div>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>$50K+</span>
                  <span className={styles.statLabel}>Paid Out</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statValue}>5K+</span>
                  <span className={styles.statLabel}>Players</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statValue}>99.9%</span>
                  <span className={styles.statLabel}>Uptime</span>
                </div>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.gamePreview}>
                <canvas
                  ref={canvasRef}
                  width={GRID_SIZE * CELL_SIZE}
                  height={GRID_SIZE * CELL_SIZE}
                  className={styles.gameCanvas}
                />
                <div className={styles.gameOverlay}>
                  <span className={styles.gameOverlayText}>Live Preview</span>
                </div>
              </div>
              <div className={styles.potBadge}>
                <span className={styles.potLabel}>Current Pot</span>
                <span className={styles.potValue}>KES 2,500</span>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.howItWorks}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>How It Works</h2>
            <p className={styles.sectionSubtitle}>Three simple steps to start winning</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <div className={styles.stepIcon}>💰</div>
              <h3 className={styles.stepTitle}>Deposit</h3>
              <p className={styles.stepDesc}>
                Add funds to your wallet using M-PESA. Minimum stake starts at KES 50.
              </p>
            </div>
            <div className={styles.stepConnector} />
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <div className={styles.stepIcon}>🎮</div>
              <h3 className={styles.stepTitle}>Play</h3>
              <p className={styles.stepDesc}>
                Create or join a match. Choose your stake amount and number of rounds.
              </p>
            </div>
            <div className={styles.stepConnector} />
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <div className={styles.stepIcon}>🏆</div>
              <h3 className={styles.stepTitle}>Win</h3>
              <p className={styles.stepDesc}>
                Outplay your opponent. Winner takes the pot minus a small platform fee.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Platform Features</h2>
            <p className={styles.sectionSubtitle}>Built for the ultimate gaming experience</p>
          </div>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⚡</div>
              <h3 className={styles.featureTitle}>Real-time Multiplayer</h3>
              <p className={styles.featureDesc}>
                Play against opponents in real-time with smooth, responsive gameplay powered by WebSockets.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📱</div>
              <h3 className={styles.featureTitle}>M-PESA Integration</h3>
              <p className={styles.featureDesc}>
                Deposit and withdraw instantly using Safaricom's M-PESA. No bank accounts needed.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎨</div>
              <h3 className={styles.featureTitle}>Neon Arcade Design</h3>
              <p className={styles.featureDesc}>
                Cyberpunk-inspired visuals with glowing snakes, particle effects, and smooth animations.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔒</div>
              <h3 className={styles.featureTitle}>Secure & Fair</h3>
              <p className={styles.featureDesc}>
                Server-authoritative game logic prevents cheating. Your funds are always protected.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to Play?</h2>
            <p className={styles.ctaSubtitle}>
              Join thousands of players competing for real cash prizes
            </p>
            <Link href="/register" className={styles.btnPrimary}>
              Create Free Account
              <span className={styles.btnArrow}>→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>🐍</span>
            <span className={styles.logoText}>SnakeBet</span>
            <span className={styles.logoAccent}>Arena</span>
          </div>
          <p className={styles.footerText}>
            © 2024 SnakeBet Arena. Play responsibly. 18+ only.
          </p>
        </div>
      </footer>
    </div>
  );
}
