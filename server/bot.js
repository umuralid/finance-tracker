const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('Set TELEGRAM_BOT_TOKEN env variable'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

const CATEGORIES = {
  rent: 'Rent', groceries: 'Groceries', grocery: 'Groceries', travel: 'Travel',
  internet: 'Internet', eb: 'EB', electricity: 'EB', loan: 'Loan',
  parents: 'Parents', medical: 'Medical', salary: 'Salary', freelance: 'Freelance',
  creditcard: 'Credit Card', cc: 'Credit Card', hotel: 'Hotel', cricket: 'Cricket',
  petrol: 'Petrol', fuel: 'Petrol'
};

bot.onText(/\/link (.+) (.+)/, async (msg, match) => {
  const user = await db.get('SELECT id, name FROM users WHERE name = ? AND password = ?', [match[1], match[2]]);
  if (!user) return bot.sendMessage(msg.chat.id, '❌ Invalid username or password');
  await db.run('INSERT OR REPLACE INTO telegram_links(chat_id, user_id) VALUES(?,?)', [String(msg.chat.id), user.id]);
  bot.sendMessage(msg.chat.id, `✅ Linked to account: ${user.name}`);
});

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const link = await db.get('SELECT user_id FROM telegram_links WHERE chat_id = ?', [String(msg.chat.id)]);
  if (!link) return bot.sendMessage(msg.chat.id, '❌ Link your account first: /link <username> <password>');

  const parts = msg.text.trim().split(/\s+/);
  if (parts.length < 2) return bot.sendMessage(msg.chat.id, '📝 Format: <category> <amount> [note]\nCategories: rent, groceries, travel, internet, eb, loan, parents, medical, salary, freelance, petrol');

  const catKey = parts[0].toLowerCase();
  const category = CATEGORIES[catKey];
  if (!category) return bot.sendMessage(msg.chat.id, `❌ Unknown category: ${parts[0]}\nUse: rent, groceries, travel, internet, eb, loan, parents, medical, salary, freelance, petrol`);

  const amount = parseFloat(parts[1]);
  if (isNaN(amount) || amount <= 0) return bot.sendMessage(msg.chat.id, '❌ Invalid amount');

  const note = parts.slice(2).join(' ') || '';
  const type = ['Salary', 'Freelance'].includes(category) ? 'income' : 'expense';
  const date = new Date().toISOString().slice(0, 10);

  await db.run('INSERT INTO transactions(user_id, type, category, amount, note, date) VALUES(?,?,?,?,?,?)',
    [link.user_id, type, category, amount, note, date]);

  const emoji = type === 'income' ? '💰' : '💸';
  bot.sendMessage(msg.chat.id, `${emoji} Added ₹${amount} ${type} (${category})${note ? ' - ' + note : ''}`);
});

bot.onText(/\/balance/, async (msg) => {
  const link = await db.get('SELECT user_id FROM telegram_links WHERE chat_id = ?', [String(msg.chat.id)]);
  if (!link) return bot.sendMessage(msg.chat.id, '❌ Link your account first');

  const month = new Date().toISOString().slice(0, 7);
  const income = await db.get("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE user_id=? AND type='income' AND strftime('%Y-%m',date)=?", [link.user_id, month]);
  const expense = await db.get("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE user_id=? AND type='expense' AND strftime('%Y-%m',date)=?", [link.user_id, month]);
  bot.sendMessage(msg.chat.id, `📊 This month:\nIncome: ₹${income.t}\nExpenses: ₹${expense.t}\nBalance: ₹${income.t - expense.t}`);
});

db.init().then(() => console.log('🤖 Telegram bot running...'));
