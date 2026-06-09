const path = require('path');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, password TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL CHECK(type IN ('income','expense')), category TEXT NOT NULL, amount REAL NOT NULL, note TEXT DEFAULT '', date TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id));
  CREATE TABLE IF NOT EXISTS telegram_links (chat_id TEXT PRIMARY KEY, user_id INTEGER);
`;

let db;

if (process.env.TURSO_DATABASE_URL) {
  const { createClient } = require('@libsql/client');
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

  db = {
    async init() { for (const s of SCHEMA.split(';').filter(s => s.trim())) await client.execute(s); },
    async run(sql, params = []) { return client.execute({ sql, args: params }); },
    async get(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows[0] || null; },
    async all(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows; },
  };
} else {
  const Database = require('better-sqlite3');
  const sqlite = new Database(path.join(__dirname, '..', 'finance.db'));
  sqlite.pragma('journal_mode = WAL');

  db = {
    async init() { sqlite.exec(SCHEMA); },
    async run(sql, params = []) { return sqlite.prepare(sql).run(...params); },
    async get(sql, params = []) { return sqlite.prepare(sql).get(...params) || null; },
    async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
  };
}

module.exports = db;
