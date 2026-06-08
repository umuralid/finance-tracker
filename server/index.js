const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const path = require('path');

app.use(cors());
app.use(express.json());

// Serve frontend in production
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Signup
app.post('/api/signup', (req, res) => {
  const { name, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (existing) return res.status(400).json({ error: 'Username already exists' });
  const result = db.prepare('INSERT INTO users(name, password) VALUES(?,?)').run(name, password);
  res.json({ id: result.lastInsertRowid, name });
});

// Login
app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const user = db.prepare('SELECT id, name FROM users WHERE name = ? AND password = ?').get(name, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  res.json(user);
});

// Get users
app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM users').all());
});

// Update user name
app.patch('/api/users/:id', (req, res) => {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name, req.params.id);
  res.json({ ok: true });
});

// Get transactions (with optional filters)
app.get('/api/transactions', (req, res) => {
  const { user_id, type, month } = req.query;
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (month) { sql += " AND strftime('%Y-%m', date) = ?"; params.push(month); }
  sql += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

// Add transaction
app.post('/api/transactions', (req, res) => {
  const { user_id, type, category, amount, note, date } = req.body;
  const result = db.prepare(
    'INSERT INTO transactions(user_id, type, category, amount, note, date) VALUES(?,?,?,?,?,?)'
  ).run(user_id, type, category, amount, note || '', date);
  res.json({ id: result.lastInsertRowid });
});

// Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Summary
app.get('/api/summary', (req, res) => {
  const { month } = req.query;
  let filter = '';
  const params = [];
  if (month) { filter = "WHERE strftime('%Y-%m', date) = ?"; params.push(month); }
  const rows = db.prepare(`
    SELECT user_id, type, category, SUM(amount) as total
    FROM transactions ${filter}
    GROUP BY user_id, type, category
  `).all(...params);
  res.json(rows);
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
