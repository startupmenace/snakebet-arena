export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  segments: Position[];
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  nextDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  color: string;
  alive: boolean;
  score: number;
}

export interface Food {
  position: Position;
  type: 'normal' | 'bonus';
}

export interface GameState {
  id: string;
  snakes: Record<string, Snake>;
  foods: Food[];
  gridWidth: number;
  gridHeight: number;
  tick: number;
  status: 'waiting' | 'countdown' | 'playing' | 'round_end' | 'game_end';
  round: number;
  maxRounds: number;
  winnerId: string | null;
  roundWinners: string[];
  startTime: number;
}

export interface PlayerInput {
  playerId: string;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

const GRID_WIDTH = 40;
const GRID_HEIGHT = 40;
const INITIAL_SNAKE_LENGTH = 5;
const TICK_INTERVAL = 150;
const FOOD_COUNT = 5;

export function createGameState(
  gameId: string,
  players: string[],
  maxRounds: number = 1
): GameState {
  const snakes: Record<string, Snake> = {};
  
  players.forEach((playerId, index) => {
    const startX = index === 0 ? 5 : GRID_WIDTH - 6;
    const startY = Math.floor(GRID_HEIGHT / 2);
    
    snakes[playerId] = {
      id: playerId,
      segments: Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
        x: startX - i,
        y: startY
      })),
      direction: index === 0 ? 'RIGHT' : 'LEFT',
      nextDirection: index === 0 ? 'RIGHT' : 'LEFT',
      color: index === 0 ? '#39ff14' : '#ff4ecd',
      alive: true,
      score: 0
    };
  });
  
  return {
    id: gameId,
    snakes,
    foods: [],
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    tick: 0,
    status: 'waiting',
    round: 1,
    maxRounds,
    winnerId: null,
    roundWinners: [],
    startTime: 0
  };
}

export function spawnFood(state: GameState): void {
  while (state.foods.length < FOOD_COUNT) {
    const position = {
      x: Math.floor(Math.random() * state.gridWidth),
      y: Math.floor(Math.random() * state.gridHeight)
    };
    
    const isOccupied = Object.values(state.snakes).some(snake =>
      snake.segments.some(seg => seg.x === position.x && seg.y === position.y)
    ) || state.foods.some(f => f.position.x === position.x && f.position.y === position.y);
    
    if (!isOccupied) {
      state.foods.push({
        position,
        type: Math.random() > 0.9 ? 'bonus' : 'normal'
      });
    }
  }
}

export function updateSnakePosition(snake: Snake): void {
  snake.direction = snake.nextDirection;
  
  const head = { ...snake.segments[0] };
  
  switch (snake.direction) {
    case 'UP': head.y--; break;
    case 'DOWN': head.y++; break;
    case 'LEFT': head.x--; break;
    case 'RIGHT': head.x++; break;
  }
  
  snake.segments.unshift(head);
  snake.segments.pop();
}

export function checkCollision(state: GameState, playerId: string): boolean {
  const snake = state.snakes[playerId];
  if (!snake || !snake.alive) return true;
  
  const head = snake.segments[0];
  
  if (head.x < 0 || head.x >= state.gridWidth || head.y < 0 || head.y >= state.gridHeight) {
    return true;
  }
  
  for (const [otherId, otherSnake] of Object.entries(state.snakes)) {
    if (otherId === playerId) continue;
    
    for (let i = 0; i < otherSnake.segments.length; i++) {
      if (head.x === otherSnake.segments[i].x && head.y === otherSnake.segments[i].y) {
        return true;
      }
    }
    
    for (let i = 1; i < snake.segments.length; i++) {
      if (head.x === snake.segments[i].x && head.y === snake.segments[i].y) {
        return true;
      }
    }
  }
  
  return false;
}

export function checkFoodCollision(state: GameState, playerId: string): number {
  const snake = state.snakes[playerId];
  if (!snake || !snake.alive) return 0;
  
  const head = snake.segments[0];
  let points = 0;
  
  state.foods = state.foods.filter(food => {
    if (food.position.x === head.x && food.position.y === head.y) {
      points += food.type === 'bonus' ? 3 : 1;
      snake.segments.push({ ...snake.segments[snake.segments.length - 1] });
      return false;
    }
    return true;
  });
  
  return points;
}

export function processGameTick(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  
  state.tick++;
  
  for (const playerId of Object.keys(state.snakes)) {
    if (state.snakes[playerId].alive) {
      updateSnakePosition(state.snakes[playerId]);
    }
  }
  
  for (const playerId of Object.keys(state.snakes)) {
    if (checkCollision(state, playerId)) {
      state.snakes[playerId].alive = false;
    } else {
      const points = checkFoodCollision(state, playerId);
      state.snakes[playerId].score += points;
    }
  }
  
  spawnFood(state);
  
  const alivePlayers = Object.values(state.snakes).filter(s => s.alive);
  const allDead = alivePlayers.length === 0;
  const oneWinner = alivePlayers.length === 1;
  
  if (allDead || oneWinner) {
    if (oneWinner) {
      state.roundWinners.push(alivePlayers[0].id);
    }
    
    if (state.round >= state.maxRounds) {
      const winnerCounts: Record<string, number> = {};
      state.roundWinners.forEach(id => {
        winnerCounts[id] = (winnerCounts[id] || 0) + 1;
      });
      
      const sortedWinners = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1]);
      
      if (sortedWinners.length > 0 && sortedWinners[0][1] > sortedWinners[1]?.[1]) {
        state.winnerId = sortedWinners[0][0];
      }
      
      state.status = 'game_end';
    } else {
      state.status = 'round_end';
    }
  }
  
  return state;
}

export function startRound(state: GameState): GameState {
  state.status = 'countdown';
  state.round++;
  state.foods = [];
  
  const playerIds = Object.keys(state.snakes);
  
  playerIds.forEach((playerId, index) => {
    const snake = state.snakes[playerId];
    const startX = index === 0 ? 5 : GRID_WIDTH - 6;
    const startY = Math.floor(GRID_HEIGHT / 2);
    
    snake.segments = Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
      x: startX - i,
      y: startY
    }));
    snake.direction = index === 0 ? 'RIGHT' : 'LEFT';
    snake.nextDirection = index === 0 ? 'RIGHT' : 'LEFT';
    snake.alive = true;
    snake.score = 0;
  });
  
  setTimeout(() => {
    state.status = 'playing';
    state.startTime = Date.now();
  }, 3000);
  
  return state;
}

export function handleInput(state: GameState, playerId: string, direction: PlayerInput['direction']): GameState {
  const snake = state.snakes[playerId];
  if (!snake) return state;
  
  const opposites: Record<string, string> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT'
  };
  
  if (direction !== opposites[snake.direction]) {
    snake.nextDirection = direction;
  }
  
  return state;
}

export function getSnakesArray(state: GameState): Array<{
  id: string;
  segments: Position[];
  color: string;
  alive: boolean;
  score: number;
}> {
  return Object.values(state.snakes).map(s => ({
    id: s.id,
    segments: s.segments,
    color: s.color,
    alive: s.alive,
    score: s.score
  }));
}

export function getGameStateForClient(state: GameState): {
  snakes: Array<{ id: string; segments: Position[]; color: string; alive: boolean; score: number }>;
  foods: Array<{ position: Position; type: string }>;
  gridWidth: number;
  gridHeight: number;
  status: string;
  round: number;
  maxRounds: number;
  winnerId: string | null;
} {
  return {
    snakes: getSnakesArray(state),
    foods: state.foods.map(f => ({ position: f.position, type: f.type })),
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    status: state.status,
    round: state.round,
    maxRounds: state.maxRounds,
    winnerId: state.winnerId
  };
}
