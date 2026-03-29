import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db !== null) return db;
  
  const dbPath = process.env.DB_PATH 
    ? path.join(process.env.DB_PATH, 'snakebet.db')
    : path.join(process.cwd(), 'snakebet.db');
  
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT '/avatars/default.png',
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      locked_balance REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      reference TEXT,
      mpesa_ref TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      guest_id TEXT,
      stake REAL NOT NULL,
      rounds INTEGER DEFAULT 1,
      mode TEXT DEFAULT 'duel',
      status TEXT DEFAULT 'waiting',
      host_paid INTEGER DEFAULT 0,
      guest_paid INTEGER DEFAULT 0,
      winner_id TEXT,
      host_score INTEGER DEFAULT 0,
      guest_score INTEGER DEFAULT 0,
      invite_code TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES users(id),
      FOREIGN KEY (guest_id) REFERENCES users(id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS mpesa_transactions (
      id TEXT PRIMARY KEY,
      checkout_request_id TEXT UNIQUE,
      transaction_id TEXT,
      phone TEXT NOT NULL,
      amount REAL,
      status TEXT DEFAULT 'pending',
      type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  db.exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('commission', '0.05')`);
  db.exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('min_stake', '50')`);
  db.exec(`INSERT OR IGNORE INTO settings (key, value) VALUES ('max_stake', '5000')`);
  
  return db;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  phone: string;
  avatar: string;
  is_admin: number;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  reference: string | null;
  mpesa_ref: string | null;
  description: string | null;
  created_at: string;
}

export interface Game {
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
  host_score: number;
  guest_score: number;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export function getUserByEmail(email: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function getUserByPhone(phone: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined;
}

export function createUser(user: Omit<User, 'created_at'>): User {
  getDb().prepare('INSERT INTO users (id, email, password_hash, username, phone, avatar, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)').run(user.id, user.email, user.password_hash, user.username, user.phone, user.avatar, user.is_admin);
  getDb().prepare('INSERT INTO wallets (id, user_id, balance, locked_balance) VALUES (?, ?, 0, 0)').run(crypto.randomUUID(), user.id);
  return getUserById(user.id)!;
}

export function getWalletByUserId(userId: string): Wallet | undefined {
  return getDb().prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId) as Wallet | undefined;
}

export function updateWalletBalance(userId: string, amount: number): void {
  getDb().prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
}

export function deductBalance(userId: string, amount: number): void {
  getDb().prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(amount, userId);
}

export function unlockFunds(userId: string, amount: number): void {
  getDb().prepare('UPDATE wallets SET balance = balance + ?, locked_balance = locked_balance - ? WHERE user_id = ?').run(amount, amount, userId);
}

export function lockFunds(userId: string, amount: number): void {
  getDb().prepare('UPDATE wallets SET balance = balance - ?, locked_balance = locked_balance + ? WHERE user_id = ?').run(amount, amount, userId);
}

export function createTransaction(tx: Omit<Transaction, 'created_at'>): Transaction {
  getDb().prepare('INSERT INTO transactions (id, user_id, type, amount, status, reference, mpesa_ref, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(tx.id, tx.user_id, tx.type, tx.amount, tx.status, tx.reference, tx.mpesa_ref, tx.description);
  return getDb().prepare('SELECT * FROM transactions WHERE id = ?').get(tx.id) as Transaction;
}

export function getTransactionsByUserId(userId: string): Transaction[] {
  return getDb().prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId) as Transaction[];
}

export function updateTransactionStatus(id: string, status: string, mpesaRef?: string): void {
  if (mpesaRef) {
    getDb().prepare('UPDATE transactions SET status = ?, mpesa_ref = ? WHERE id = ?').run(status, mpesaRef, id);
  } else {
    getDb().prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, id);
  }
}

export function getGameById(id: string): Game | undefined {
  return getDb().prepare('SELECT * FROM games WHERE id = ?').get(id) as Game | undefined;
}

export function getGameByInviteCode(code: string): Game | undefined {
  return getDb().prepare('SELECT * FROM games WHERE invite_code = ?').get(code) as Game | undefined;
}

export function getWaitingGames(): Game[] {
  return getDb().prepare('SELECT g.*, u1.username as host_username, u2.username as guest_username FROM games g LEFT JOIN users u1 ON g.host_id = u1.id LEFT JOIN users u2 ON g.guest_id = u2.id WHERE g.status = ? AND g.host_paid = 1 ORDER BY g.created_at DESC').all('waiting') as Game[];
}

export function getGamesByUserId(userId: string): Game[] {
  return getDb().prepare('SELECT * FROM games WHERE host_id = ? OR guest_id = ? ORDER BY created_at DESC LIMIT 20').all(userId, userId) as Game[];
}

export function createGame(game: Omit<Game, 'created_at' | 'updated_at'>): Game {
  getDb().prepare('INSERT INTO games (id, host_id, guest_id, stake, rounds, mode, status, host_paid, guest_paid, winner_id, host_score, guest_score, invite_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(game.id, game.host_id, game.guest_id, game.stake, game.rounds, game.mode, game.status, game.host_paid, game.guest_paid, game.winner_id, game.host_score, game.guest_score, game.invite_code);
  return getGameById(game.id)!;
}

export function updateGame(id: string, updates: Partial<Game>): void {
  const game = getGameById(id);
  if (!game) return;
  const updated = { ...game, ...updates, updated_at: new Date().toISOString() };
  getDb().prepare('UPDATE games SET guest_id = ?, status = ?, host_paid = ?, guest_paid = ?, winner_id = ?, host_score = ?, guest_score = ?, updated_at = ? WHERE id = ?').run(updated.guest_id, updated.status, updated.host_paid, updated.guest_paid, updated.winner_id, updated.host_score, updated.guest_score, updated.updated_at, id);
}

export function getSetting(key: string): string {
  const result = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return result?.value || '';
}

export function updateSetting(key: string, value: string): void {
  getDb().prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
}

export function getStats(): { totalUsers: number; totalGames: number; totalVolume: number } {
  const users = getDb().prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const games = getDb().prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
  const volume = getDb().prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type IN ('stake', 'win')").get() as { total: number };
  return { totalUsers: users.count, totalGames: games.count, totalVolume: volume.total };
}

export function getLeaderboard(): { username: string; total_wins: number; total_earnings: number }[] {
  return getDb().prepare('SELECT u.username, COUNT(CASE WHEN g.winner_id = u.id THEN 1 END) as total_wins, COALESCE(SUM(CASE WHEN g.winner_id = u.id THEN g.stake * (1 - ?) END), 0) as total_earnings FROM users u LEFT JOIN games g ON (u.id = g.host_id OR u.id = g.guest_id) AND g.status = ? GROUP BY u.id HAVING total_wins > 0 ORDER BY total_earnings DESC LIMIT 10').all(getSetting('commission'), 'completed') as { username: string; total_wins: number; total_earnings: number }[];
}

export function mpesaTransactionExists(checkoutRequestId: string): boolean {
  const result = getDb().prepare('SELECT id FROM mpesa_transactions WHERE checkout_request_id = ?').get(checkoutRequestId);
  return !!result;
}

export function createMpesaTransaction(tx: { id: string; checkout_request_id: string; phone: string; amount: number; type: string }): void {
  getDb().prepare('INSERT INTO mpesa_transactions (id, checkout_request_id, phone, amount, type, status) VALUES (?, ?, ?, ?, ?, ?)').run(tx.id, tx.checkout_request_id, tx.phone, tx.amount, tx.type, 'pending');
}

export function updateMpesaTransaction(checkoutRequestId: string, transactionId: string, status: string): void {
  getDb().prepare('UPDATE mpesa_transactions SET transaction_id = ?, status = ? WHERE checkout_request_id = ?').run(transactionId, status, checkoutRequestId);
}

export function getMpesaTransaction(checkoutRequestId: string) {
  return getDb().prepare('SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?').get(checkoutRequestId);
}


