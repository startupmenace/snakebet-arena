import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import {
  createGameState,
  processGameTick,
  handleInput,
  startRound,
  getGameStateForClient
} from './lib/game-engine';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const activeGames: Map<string, any> = new Map();
const playerSockets: Map<string, string> = new Map();
const socketPlayers: Map<string, string> = new Map();
const gameIntervals: Map<string, NodeJS.Timeout> = new Map();
const gameReadyPlayers: Map<string, Set<string>> = new Map();

function startGameOnServer(gameId: string, players: string[], maxRounds: number) {
  console.log(`[Server] Creating game state for ${gameId} with ${players.length} players`);
  
  if (activeGames.has(gameId)) {
    console.log(`[Server] Game ${gameId} already exists!`);
    return;
  }
  
  const gameState = createGameState(gameId, players, maxRounds);
  gameState.status = 'countdown';
  activeGames.set(gameId, gameState);
  
  console.log(`[Server] Emitting countdown_start`);
  io.to(gameId).emit('countdown_start', { countdown: 10 });
  
  setTimeout(() => {
    if (!activeGames.has(gameId)) return;
    
    const state = activeGames.get(gameId);
    state.status = 'playing';
    state.startTime = Date.now();
    
    console.log(`[Server] Emitting game_start`);
    io.to(gameId).emit('game_start', getGameStateForClient(state));
    
    const interval = setInterval(() => {
      const s = activeGames.get(gameId);
      if (!s || s.status !== 'playing') {
        clearInterval(interval);
        gameIntervals.delete(gameId);
        return;
      }
      
      const updated = processGameTick(s);
      activeGames.set(gameId, updated);
      io.to(gameId).emit('game_tick', getGameStateForClient(updated));
      
      if (updated.status === 'round_end' || updated.status === 'game_end') {
        clearInterval(interval);
        gameIntervals.delete(gameId);
        
        io.to(gameId).emit('round_end', {
          round: updated.round,
          winnerId: updated.roundWinners[updated.roundWinners.length - 1],
          scores: Object.values(updated.snakes).map(sn => ({ id: sn.id, score: sn.score }))
        });
        
        if (updated.status === 'game_end') {
          io.to(gameId).emit('game_end', {
            winnerId: updated.winnerId,
            roundWinners: updated.roundWinners
          });
          activeGames.delete(gameId);
          gameReadyPlayers.delete(gameId);
        } else {
          setTimeout(() => {
            if (updated.status === 'round_end' && updated.round < updated.maxRounds) {
              startRound(updated);
              updated.status = 'playing';
              
              io.to(gameId).emit('game_start', getGameStateForClient(updated));
              
              const newInterval = setInterval(() => {
                const ns = activeGames.get(gameId);
                if (!ns || ns.status !== 'playing') {
                  clearInterval(newInterval);
                  return;
                }
                
                const next = processGameTick(ns);
                activeGames.set(gameId, next);
                io.to(gameId).emit('game_tick', getGameStateForClient(next));
                
                if (next.status === 'round_end' || next.status === 'game_end') {
                  clearInterval(newInterval);
                  gameIntervals.delete(gameId);
                  
                  io.to(gameId).emit('round_end', {
                    round: next.round,
                    winnerId: next.roundWinners[next.roundWinners.length - 1],
                    scores: Object.values(next.snakes).map(sn => ({ id: sn.id, score: sn.score }))
                  });
                  
                  if (next.status === 'game_end') {
                    io.to(gameId).emit('game_end', {
                      winnerId: next.winnerId,
                      roundWinners: next.roundWinners
                    });
                    activeGames.delete(gameId);
                    gameReadyPlayers.delete(gameId);
                  }
                }
              }, 150);
              
              gameIntervals.set(gameId, newInterval);
            }
          }, 3000);
        }
      }
    }, 150);
    
    gameIntervals.set(gameId, interval);
  }, 3000);
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_URL || '*',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);
    
    socket.on('join_game', (data: { gameId: string; playerId: string }) => {
      const { gameId, playerId } = data;
      
      socket.join(gameId);
      socketPlayers.set(socket.id, playerId);
      playerSockets.set(playerId, socket.id);
      
      if (!gameReadyPlayers.has(gameId)) {
        gameReadyPlayers.set(gameId, new Set());
      }
      
      console.log(`[Server] Player ${playerId} joined game ${gameId}`);
      
      socket.emit('player_joined', { playerId });
      socket.to(gameId).emit('opponent_joined', { playerId });
      
      const gameState = activeGames.get(gameId);
      if (gameState) {
        socket.emit('game_state', getGameStateForClient(gameState));
      }
    });
    
    socket.on('player_ready', (data: { gameId: string; playerId: string; players: string[]; maxRounds: number }) => {
      const { gameId, playerId, players, maxRounds } = data;
      
      console.log(`[Server] Player ${playerId} is ready for game ${gameId}`);
      
      const readySet = gameReadyPlayers.get(gameId) || new Set();
      gameReadyPlayers.set(gameId, readySet);
      readySet.add(playerId);
      
      const validPlayers = players.filter(Boolean);
      const allPlayersReady = validPlayers.length === 2 && readySet.size >= 2;
      
      console.log(`[Server] Ready: ${Array.from(readySet).join(', ')} / Need: ${validPlayers.join(', ')}`);
      
      if (allPlayersReady && !activeGames.has(gameId)) {
        console.log(`[Server] Starting game ${gameId}!`);
        startGameOnServer(gameId, validPlayers, maxRounds);
      }
    });
    
    socket.on('input', (data: { gameId: string; playerId: string; direction: string }) => {
      const { gameId, playerId, direction } = data;
      const gameState = activeGames.get(gameId);
      
      if (gameState && gameState.status === 'playing') {
        handleInput(gameState, playerId, direction as any);
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`[Server] Client disconnected: ${socket.id}`);
      const playerId = socketPlayers.get(socket.id);
      if (playerId) {
        socketPlayers.delete(socket.id);
        playerSockets.delete(playerId);
      }
    });
  });
  
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running on port ${port}`);
  });
});

export { activeGames };
