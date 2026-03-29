# SnakeBet Arena - Multiplayer Snake Betting Platform

## Concept & Vision

SnakeBet Arena is a high-energy, neon-drenched competitive gaming platform where players wage real stakes on their Snake skills. The experience feels like stepping into a cyberpunk arcade—glowing neon trails, pulsing animations, and the electric thrill of wagering against real opponents. Every game is a showdown; every win is a celebration.

## Design Language

### Aesthetic Direction
Cyberpunk arcade meets Vegas energy. Deep dark backgrounds with explosive neon accents. The UI should feel alive—breathing, pulsing, reacting to every interaction. Think Tron meets a high-stakes poker room.

### Color Palette
```
Primary Pink:     #ff4ecd (buttons, highlights, winner effects)
Neon Green:       #39ff14 (snakes, success states, money indicators)
Electric Blue:    #00d4ff (secondary accents, player 2 elements)
Deep Purple:      #1a0a2e (background base)
Dark Surface:     #0d0d1a (cards, panels)
Surface:          #16162a (elevated elements)
Text Primary:     #ffffff
Text Secondary:   #8b8ba3
Error Red:        #ff4757
Warning Orange:   #ffa502
Success Green:    #2ed573
```

### Typography
- **Headings**: Orbitron (futuristic, geometric) - Bold 700
- **Body**: Space Grotesk (clean, modern, readable)
- **Monospace/Numbers**: JetBrains Mono (for stats, wallet balances)
- **Fallback**: system-ui, sans-serif

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- Border radius: 4px (small), 8px (medium), 16px (large), 24px (xl)
- Card elevation via glow effects, not shadows

### Motion Philosophy
- **Idle pulse**: Subtle glow animations on key elements (wallet balance, active buttons)
- **Micro-interactions**: Scale 1.02 on hover, spring-back on click
- **Entrance**: Staggered fade-up, 200ms delay between items
- **Victory**: Explosive particle confetti, screen flash
- **Death**: Screen shake, red flash overlay
- **Money transactions**: Counting animation, success sparkle

### Visual Assets
- **Icons**: Lucide React (consistent, clean)
- **Snake sprites**: Custom SVG with gradient fills and glow filters
- **Food**: Pulsing geometric shapes with particle aura
- **Backgrounds**: Subtle animated grid, floating particles
- **Decorative**: Neon line borders, circuit patterns

## Layout & Structure

### Pages

1. **Landing Page** (`/`)
   - Hero with animated Snake game preview
   - Value proposition (bet, play, win)
   - CTA buttons: Play Now, How It Works
   - Social proof: leaderboard preview, recent winners

2. **Auth Pages** (`/login`, `/register`)
   - Minimal form design
   - M-PESA phone number input with validation
   - Google OAuth button
   - Animated background

3. **Dashboard** (`/dashboard`)
   - Wallet card (balance, quick actions)
   - Quick play button
   - Active matches
   - Recent games
   - Earnings chart
   - Navigation sidebar

4. **Game Lobby** (`/play`)
   - Create game panel (stake amount, rounds, mode)
   - Public games list
   - Invite link generation
   - Waiting room

5. **Game Arena** (`/game/[id]`)
   - Split-screen Snake gameplay
   - Real-time score overlay
   - Stake/pot display
   - Chat/spectator section
   - Round indicators

6. **Wallet** (`/wallet`)
   - Deposit via M-PESA
   - Withdraw via M-PESA
   - Transaction history
   - Balance overview

7. **Profile** (`/profile`)
   - Stats (wins/losses/earnings)
   - Match history
   - Avatar selection
   - Settings

8. **Admin Dashboard** (`/admin`)
   - Revenue metrics
   - Active users
   - Game management
   - Fraud alerts
   - Commission settings

### Responsive Strategy
- Mobile-first gameplay with touch controls
- Desktop: Full arcade experience
- Tablet: Optimized split-view
- Breakpoints: 640px, 768px, 1024px, 1280px

## Features & Interactions

### Authentication
- Email + password registration with phone number (M-PESA)
- Google OAuth integration
- JWT-based sessions
- Phone verification via OTP for withdrawals

### Wallet System
- **Deposit**: M-PESA STK Push, callback confirmation
- **Withdraw**: B2C API, pending → success/failed states
- **Stake Locking**: Funds locked when match created
- **Transactions**: Type (deposit/stake/win/withdraw), amount, status, timestamp
- **Commission**: Configurable 5-10% per match

### Matchmaking
- **Create Game**: Select stake (KES 50-5000), rounds (1/3/5/7), mode (1v1/arena)
- **Join Options**: 
  - Public lobby (visible to all)
  - Private invite link
  - Random match
- **States**: 
  - `waiting` - Waiting for opponent
  - `payment_pending` - Waiting for stake payments
  - `ready` - Both paid, countdown to start
  - `playing` - Game in progress
  - `completed` - Winner determined
  - `cancelled` - Refunded

### Multiplayer Snake Game
- **Grid**: 40x40 cells, responsive sizing
- **Movement**: Arrow keys / WASD / swipe
- **Speed**: 150ms tick (adjustable by round)
- **Growth**: +1 segment per food eaten
- **Collision**: Wall = death, body = death
- **Modes**:
  - **Duels**: Mirror maps, same food positions, last alive wins
  - **Arena**: Shared map, first to 10 points wins
- **Sync**: Server-authoritative, WebSocket updates
- **Timeout**: 3 second input lag = forfeit

### Winnings Distribution
- Pot = stake × players × (1 - commission)
- Winner receives full pot
- Loser forfeits stake
- Refund logic for cancelled games

### Edge Cases
- **No opponent**: AI fallback after 60 seconds
- **Disconnect**: 10 second timeout = loss
- **Payment timeout**: 5 minute window, then refund
- **Duplicate callbacks**: Idempotency via transaction ID tracking
- **Draw**: Sudden death overtime round

## Component Inventory

### Navigation
- **Navbar**: Logo, wallet balance (pulsing), profile avatar, logout
- **Sidebar**: Icons + labels, collapsible on mobile
- **States**: Default, active route (glow), hover (scale)

### Buttons
- **Primary**: Pink gradient, glow shadow, pulse on hover
- **Secondary**: Outlined, fill on hover
- **Ghost**: Text only, underline on hover
- **States**: Default, hover (scale 1.02), active (scale 0.98), disabled (50% opacity), loading (spinner)

### Cards
- **Game Card**: Player avatars, stake amount, status badge, join button
- **Wallet Card**: Balance (large, animated), action buttons
- **Transaction Row**: Icon, description, amount (color-coded), timestamp
- **Player Card**: Avatar, username, win rate, current stake

### Forms
- **Input**: Dark background, neon border on focus, floating label
- **Select**: Custom dropdown with animations
- **Slider**: For stake amount, neon track fill
- **States**: Default, focus (glow), error (red border + message), disabled

### Modals
- **Payment Modal**: M-PESA animation, amount, phone number, status
- **Result Modal**: Winner announcement, confetti, earnings breakdown
- **Confirm Modal**: Action warning, cancel/confirm buttons

### Game UI
- **Snake**: SVG with gradient, glowing eyes, trail particles
- **Food**: Pulsing orb with particle aura
- **Grid**: Subtle lines, darker cells
- **Score Overlay**: Floating panel, player scores, timer
- **Controls**: Virtual D-pad for mobile

### Loading States
- **Skeleton**: Animated gradient shimmer
- **Spinner**: Neon ring rotation
- **Progress**: Linear bar with glow

### Empty States
- Centered illustration
- Helpful message
- CTA button

### Error States
- Red border/icon
- Clear error message
- Retry action

## Technical Approach

### Stack
- **Frontend**: Next.js 14 (App Router)
- **Styling**: CSS Modules + CSS Variables
- **State**: React Context + useReducer for game state
- **Real-time**: Socket.IO (client + custom server)
- **Database**: SQLite (file-based, portable) via better-sqlite3
- **Auth**: JWT with HTTP-only cookies
- **M-PESA**: Safaricom Daraja API 3.0

### Project Structure
```
/app
  /api
    /auth/[...auth]/route.ts
    /wallet/deposit/route.ts
    /wallet/withdraw/route.ts
    /mpesa/callback/route.ts
    /games/route.ts
    /games/[id]/route.ts
  /(pages)
    /page.tsx (landing)
    /login/page.tsx
    /register/page.tsx
    /dashboard/page.tsx
    /play/page.tsx
    /game/[id]/page.tsx
    /wallet/page.tsx
    /profile/page.tsx
    /admin/page.tsx
  /components
  /lib
  /styles
/server
  /socket.ts (WebSocket server)
  /game-engine.ts
  /mpesa.ts
  /db.ts
/public
  /sounds
  /images
```

### API Design

#### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, return JWT
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Current user

#### Wallet
- `GET /api/wallet` - Get balance + history
- `POST /api/wallet/deposit` - Initiate STK Push
- `POST /api/wallet/withdraw` - Initiate B2C

#### M-PESA
- `POST /api/mpesa/callback` - STK/B2C callback
- `GET /api/mpesa/status/:id` - Check transaction

#### Games
- `GET /api/games` - List available games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Game details
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/stake` - Confirm stake payment

### Data Model

#### User
```typescript
{
  id: string
  email: string
  passwordHash: string
  username: string
  phone: string
  avatar: string
  createdAt: Date
  isAdmin: boolean
}
```

#### Wallet
```typescript
{
  id: string
  userId: string
  balance: number
  lockedBalance: number
}
```

#### Transaction
```typescript
{
  id: string
  userId: string
  type: 'deposit' | 'withdraw' | 'stake' | 'win' | 'refund' | 'commission'
  amount: number
  status: 'pending' | 'success' | 'failed'
  reference: string
  createdAt: Date
}
```

#### Game
```typescript
{
  id: string
  hostId: string
  guestId: string | null
  stake: number
  rounds: number
  mode: 'duel' | 'arena'
  status: 'waiting' | 'payment_pending' | 'ready' | 'playing' | 'completed' | 'cancelled'
  hostPaid: boolean
  guestPaid: boolean
  winnerId: string | null
  hostScore: number
  guestScore: number
  createdAt: Date
  updatedAt: Date
}
```

### Security
- Password hashing with bcrypt
- JWT expiry: 7 days
- Rate limiting: 100 req/min
- Input validation with Zod
- CSRF protection
- Payment idempotency via reference tracking
