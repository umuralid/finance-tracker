const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Signup
app.post('/api/signup', async (req, res) => {
  const { name, password } = req.body;
  const existing = await db.get('SELECT id FROM users WHERE name = ?', [name]);
  if (existing) return res.status(400).json({ error: 'Username already exists' });
  const result = await db.run('INSERT INTO users(name, password) VALUES(?,?)', [name, password]);
  res.json({ id: result.lastInsertRowid, name });
});

// Login
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  const user = await db.get('SELECT id, name FROM users WHERE name = ? AND password = ?', [name, password]);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  res.json(user);
});

// Get users
app.get('/api/users', async (req, res) => {
  res.json(await db.all('SELECT id, name FROM users'));
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
  const { user_id, type, month } = req.query;
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (month) { sql += " AND strftime('%Y-%m', date) = ?"; params.push(month); }
  sql += ' ORDER BY date DESC, id DESC';
  res.json(await db.all(sql, params));
});

// Add transaction
app.post('/api/transactions', async (req, res) => {
  const { user_id, type, category, amount, note, date } = req.body;
  const result = await db.run(
    'INSERT INTO transactions(user_id, type, category, amount, note, date) VALUES(?,?,?,?,?,?)',
    [user_id, type, category, amount, note || '', date]
  );
  res.json({ id: result.lastInsertRowid });
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  await db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Summary
app.get('/api/summary', async (req, res) => {
  const { month } = req.query;
  let sql = 'SELECT user_id, type, category, SUM(amount) as total FROM transactions';
  const params = [];
  if (month) { sql += " WHERE strftime('%Y-%m', date) = ?"; params.push(month); }
  sql += ' GROUP BY user_id, type, category';
  res.json(await db.all(sql, params));
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html')));

const PORT = process.env.PORT || 3001;

db.init().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
});
