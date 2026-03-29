'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import io from 'socket.io-client';
import Navbar from '@/app/components/Navbar';
import Confetti from '@/app/components/Confetti';
import styles from './game.module.css';

interface Game {
  id: string;
  host_id: string;
  guest_id: string | null;
  stake: number;
  rounds: number;
  mode: string;
  status: string;
  host_paid: number;
  guest_paid: number;
  winner_id: string | null;
  hostUsername: string;
  guestUsername: string | null;
}

interface Position {
  x: number;
  y: number;
}

interface Snake {
  id: string;
  segments: Position[];
  color: string;
  alive: boolean;
  score: number;
}

interface Food {
  position: Position;
  type: string;
}

interface GameState {
  snakes: Snake[];
  foods: Food[];
  gridWidth: number;
  gridHeight: number;
  status: string;
  round: number;
  maxRounds: number;
  winnerId: string | null;
}

const CELL_SIZE = 16;

export default function GamePage() {
  const [game, setGame] = useState<Game | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [roundResult, setRoundResult] = useState<{ winnerId: string; scores: { id: string; score: number }[] } | null>(null);
  const [gameResult, setGameResult] = useState<{ winnerId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  const router = useRouter();
  const params = useParams();
  const isPlayerReady = useRef(false);
  const gameDataRef = useRef<Game | null>(null);

  const refreshGameData = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${params.id}`);
      const data = await res.json();
      if (data.game) {
        setGame(data.game);
        gameDataRef.current = data.game;
        return data.game;
      }
    } catch (e) {
      console.error('Failed to refresh game:', e);
    }
    return null;
  }, [params.id]);

  const tryStartGame = useCallback((currentGame: Game) => {
    if (!socketRef.current || isPlayerReady.current) return;
    
    const players = [currentGame.host_id, currentGame.guest_id].filter(Boolean);
    const bothPlayersReady = players.length === 2 && 
                            currentGame.host_paid === 1 && 
                            currentGame.guest_paid === 1;
    
    if (bothPlayersReady) {
      console.log(`[Client] Both players ready! Players: ${players.join(', ')}`);
      isPlayerReady.current = true;
      setWaiting(false);
      
      socketRef.current.emit('player_ready', {
        gameId: currentGame.id,
        playerId: userId,
        players,
        maxRounds: currentGame.rounds
      });
    }
  }, [userId]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;

    const initGame = async () => {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        
        const userData = await userRes.json();
        setUserId(userData.user.id);
        
        let currentGame = await refreshGameData();
        
        if (!currentGame) {
          router.push('/play');
          return;
        }
        
        if (currentGame.guest_id === null && currentGame.host_id !== userData.user.id) {
          const joinRes = await fetch(`/api/games/${params.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join' })
          });
          
          if (joinRes.ok) {
            const joinData = await joinRes.json();
            currentGame = joinData.game;
            setGame(currentGame);
            gameDataRef.current = currentGame;
          }
        }
        
        setWaiting(currentGame.guest_id === null);
        
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000
        });
        
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log(`[Client] Socket connected: ${socket.id}`);
          reconnectAttempts = 0;
          socket.emit('join_game', { gameId: currentGame!.id, playerId: userData.user.id });
          
          setTimeout(() => {
            tryStartGame(gameDataRef.current || currentGame!);
          }, 500);
        });

        socket.on('player_joined', () => {
          console.log('[Client] Player joined confirmation received');
          setTimeout(() => refreshGameData().then(g => g && tryStartGame(g)), 300);
        });

        socket.on('opponent_joined', () => {
          console.log('[Client] Opponent joined!');
          refreshGameData().then(g => g && tryStartGame(g));
        });

        socket.on('countdown_start', ({ countdown: count }: { countdown: number }) => {
          console.log(`[Client] Countdown: ${count}`);
          setWaiting(false);
          setCountdown(count);
          setCountdown(10);
        });

        socket.on('game_start', (state: GameState) => {
          console.log('[Client] Game started!');
          setWaiting(false);
          setGameState(state);
          setCountdown(0);
          setRoundResult(null);
        });

        socket.on('game_tick', (state: GameState) => {
          setGameState(state);
        });

        socket.on('round_end', (result: { winnerId: string; scores: { id: string; score: number }[] }) => {
          setRoundResult(result);
        });

        socket.on('game_end', (result: { winnerId: string | null }) => {
          setGameResult(result);
          if (result.winnerId === userData.user.id) {
            setShowConfetti(true);
          }
        });

        socket.on('disconnect', () => {
          console.log('[Client] Socket disconnected');
        });

        socket.on('reconnect', () => {
          console.log('[Client] Socket reconnected');
          reconnectAttempts = 0;
          socket.emit('join_game', { gameId: currentGame!.id, playerId: userData.user.id });
          setTimeout(() => tryStartGame(gameDataRef.current || currentGame!), 500);
        });

        tryStartGame(currentGame);

        pollInterval = setInterval(async () => {
          const g = await refreshGameData();
          if (g) {
            tryStartGame(g);
          }
        }, 2000);

      } catch (error) {
        console.error('Failed to initialize game:', error);
        router.push('/play');
      } finally {
        setLoading(false);
      }
    };

    initGame();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [params.id, router, refreshGameData, tryStartGame]);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    
    if (countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [countdown]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameState || gameState.status !== 'playing') return;
    
    const keyMap: Record<string, string> = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      w: 'UP',
      s: 'DOWN',
      a: 'LEFT',
      d: 'RIGHT'
    };
    
    const direction = keyMap[e.key];
    if (direction && socketRef.current) {
      e.preventDefault();
      socketRef.current.emit('input', {
        gameId: game?.id,
        playerId: userId,
        direction
      });
    }
  }, [gameState, game?.id, userId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!gameState || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = gameState.gridWidth * CELL_SIZE;
    const height = gameState.gridHeight * CELL_SIZE;
    canvas.width = width;
    canvas.height = height;
    
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(255, 78, 205, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gameState.gridWidth; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, height);
      ctx.stroke();
    }
    for (let i = 0; i <= gameState.gridHeight; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(width, i * CELL_SIZE);
      ctx.stroke();
    }
    
    gameState.foods.forEach(food => {
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      const gradient = ctx.createRadialGradient(
        food.position.x * CELL_SIZE + CELL_SIZE / 2,
        food.position.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        food.position.x * CELL_SIZE + CELL_SIZE / 2,
        food.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, `rgba(255, 78, 205, ${pulse})`);
      gradient.addColorStop(1, 'rgba(255, 78, 205, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        food.position.x * CELL_SIZE + CELL_SIZE / 2,
        food.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    
    gameState.snakes.forEach(snake => {
      snake.segments.forEach((segment, index) => {
        const gradient = ctx.createRadialGradient(
          segment.x * CELL_SIZE + CELL_SIZE / 2,
          segment.y * CELL_SIZE + CELL_SIZE / 2,
          0,
          segment.x * CELL_SIZE + CELL_SIZE / 2,
          segment.y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE / 2
        );
        
        const color = snake.color;
        gradient.addColorStop(0, index === 0 ? color : color + 'cc');
        gradient.addColorStop(1, index === 0 ? color + '99' : color + '66');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          4
        );
        ctx.fill();
        
        if (index === 0 && snake.alive) {
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
      
      if (!snake.alive) {
        ctx.strokeStyle = snake.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        snake.segments.forEach((seg, i) => {
          const x = seg.x * CELL_SIZE + CELL_SIZE / 2;
          const y = seg.y * CELL_SIZE + CELL_SIZE / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    
  }, [gameState]);

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString('en-KE')}`;

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const isHost = game?.host_id === userId;

  return (
    <div className={styles.page}>
      <Navbar />
      <Confetti active={showConfetti} />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.gameInfo}>
              <span className={styles.stake}>{formatCurrency(game?.stake || 0)}</span>
              <span className={styles.separator}>•</span>
              <span>Round {gameState?.round || 1}/{game?.rounds || 1}</span>
            </div>
            <Link href="/play" className={styles.exitBtn}>Exit</Link>
          </div>

          <div className={styles.gameArea}>
            <div className={styles.scoreBoard}>
              <div className={`${styles.playerScore} ${styles.host}`}>
                <div className={styles.playerAvatar} style={{ background: '#39ff14' }}>
                  {game?.hostUsername?.charAt(0).toUpperCase()}
                </div>
                <div className={styles.playerDetails}>
                  <span className={styles.playerName}>
                    {game?.hostUsername}
                    {isHost && <span className={styles.youBadge}>(You)</span>}
                  </span>
                  <span className={styles.playerScoreValue}>
                    {gameState?.snakes.find(s => s.id === game?.host_id)?.score || 0}
                  </span>
                </div>
              </div>

              <div className={styles.vs}>VS</div>

              <div className={`${styles.playerScore} ${styles.guest}`}>
                <div className={styles.playerAvatar} style={{ background: '#ff4ecd' }}>
                  {game?.guestUsername?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className={styles.playerDetails}>
                  <span className={styles.playerName}>
                    {game?.guestUsername || 'Waiting...'}
                    {!isHost && game?.guestUsername && <span className={styles.youBadge}>(You)</span>}
                  </span>
                  <span className={styles.playerScoreValue}>
                    {gameState?.snakes.find(s => s.id === game?.guest_id)?.score || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.gameCanvas}>
              {waiting && !gameState && (
                <div className={styles.waitingOverlay}>
                  <div className={styles.spinner} />
                  <p>{game?.guest_id ? 'Starting...' : 'Waiting for opponent...'}</p>
                  {isHost && (
                    <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                      Share link: {typeof window !== 'undefined' ? window.location.origin + '/game/' + params.id : ''}
                    </p>
                  )}
                </div>
              )}

              {countdown > 0 && (
                <div className={styles.countdown}>
                  <span className={styles.countdownNumber}>{countdown}</span>
                  <span className={styles.countdownText}>Get Ready!</span>
                </div>
              )}

              <canvas ref={canvasRef} className={styles.canvas} />

              {!gameState && countdown === 0 && !waiting && (
                <div className={styles.waitingOverlay}>
                  <span>🎮</span>
                  <p>Starting...</p>
                </div>
              )}
            </div>

            <div className={styles.controls}>
              <p className={styles.controlsHint}>Use Arrow Keys or WASD to move</p>
              <div className={styles.mobileControls}>
                <button className={styles.controlBtn} onPointerDown={() => socketRef.current?.emit('input', { gameId: game?.id, playerId: userId, direction: 'UP' })}>↑</button>
                <button className={styles.controlBtn} onPointerDown={() => socketRef.current?.emit('input', { gameId: game?.id, playerId: userId, direction: 'LEFT' })}>←</button>
                <button className={styles.controlBtn} onPointerDown={() => socketRef.current?.emit('input', { gameId: game?.id, playerId: userId, direction: 'DOWN' })}>↓</button>
                <button className={styles.controlBtn} onPointerDown={() => socketRef.current?.emit('input', { gameId: game?.id, playerId: userId, direction: 'RIGHT' })}>→</button>
              </div>
            </div>
          </div>

          {roundResult && !gameResult && (
            <div className={styles.roundResult}>
              <h3>Round {gameState?.round} Complete!</h3>
              <p>Winner: {roundResult.winnerId === game?.host_id ? game?.hostUsername : game?.guestUsername}</p>
              <p>Next round starting soon...</p>
            </div>
          )}

          {gameResult && (
            <div className={`${styles.gameResult} ${gameResult.winnerId === userId ? styles.winner : styles.loser}`}>
              <div className={styles.resultIcon}>
                {gameResult.winnerId === userId ? '🏆' : '💀'}
              </div>
              <h2>{gameResult.winnerId === userId ? 'Victory!' : 'Defeat'}</h2>
              <p>
                {gameResult.winnerId === userId 
                  ? `You won ${formatCurrency((game?.stake || 0) * 2 * 0.95)}`
                  : `You lost ${formatCurrency(game?.stake || 0)}`
                }
              </p>
              <div className={styles.resultActions}>
                <Link href="/play" className={styles.playAgainBtn}>Play Again</Link>
                <Link href="/dashboard" className={styles.backBtn}>Dashboard</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
