const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'snakebet.db');
const db = new Database(dbPath);

console.log('🔧 SnakeBet Admin Setup');
console.log('========================\n');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/create-admin.js <email> <password>');
  console.log('Example: node scripts/create-admin.js admin@snakebet.com mypassword123');
  process.exit(1);
}

async function createAdmin() {
  try {
    const passwordHash = bcrypt.hashSync(password, 12);
    const userId = crypto.randomUUID();
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    if (existing) {
      console.log(`User ${email} already exists. Making them admin...`);
      db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email);
      console.log('✅ User is now an admin!');
    } else {
      console.log(`Creating new user ${email}...`);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, username, phone, avatar, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(userId, email, passwordHash, email.split('@')[0], '254700000000', '/avatars/default.png');
      
      db.prepare(`
        INSERT INTO wallets (id, user_id, balance, locked_balance)
        VALUES (?, ?, 0, 0)
      `).run(crypto.randomUUID(), userId);
      
      console.log('✅ Admin user created!');
    }
    
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🌐 Access admin at: /admin');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    db.close();
  }
}

createAdmin();
