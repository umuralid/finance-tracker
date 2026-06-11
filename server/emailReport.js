const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./db');

const REPORT_EMAIL = 'muralivijay9333@gmail.com';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // Use Gmail App Password
  }
});

async function generateMonthlyReport(month) {
  const transactions = await db.all(
    "SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date, id",
    [month]
  );
  const users = await db.all('SELECT id, name FROM users');
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  let totalIncome = 0, totalExpense = 0;
  const byCategory = {};

  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  // Build CSV
  const csvHeader = 'Date,User,Type,Category,Amount,Note\n';
  const csvRows = transactions.map(t =>
    `${t.date},${userMap[t.user_id] || t.user_id},${t.type},${t.category},${t.amount},"${t.note || ''}"`
  ).join('\n');

  // Build HTML summary
  const categoryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `<tr><td style="padding:4px 12px">${cat}</td><td style="padding:4px 12px">₹${amt.toLocaleString('en-IN')}</td></tr>`)
    .join('');

  const html = `
    <h2>📊 Monthly Finance Report — ${month}</h2>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td><strong>Total Income:</strong></td><td style="color:green;padding-left:12px">₹${totalIncome.toLocaleString('en-IN')}</td></tr>
      <tr><td><strong>Total Expenses:</strong></td><td style="color:red;padding-left:12px">₹${totalExpense.toLocaleString('en-IN')}</td></tr>
      <tr><td><strong>Balance:</strong></td><td style="padding-left:12px">₹${(totalIncome - totalExpense).toLocaleString('en-IN')}</td></tr>
    </table>
    <h3>Category Breakdown</h3>
    <table style="border-collapse:collapse;border:1px solid #ddd">
      <tr style="background:#f5f5f5"><th style="padding:6px 12px">Category</th><th style="padding:6px 12px">Amount</th></tr>
      ${categoryRows}
    </table>
    <p style="color:#888;margin-top:16px">Full transaction details attached as CSV.</p>
  `;

  return { html, csv: csvHeader + csvRows, totalIncome, totalExpense };
}

async function sendMonthlyReport() {
  const now = new Date();
  // Report for current month (runs on last day)
  const month = now.toISOString().slice(0, 7);

  console.log(`📧 Generating monthly report for ${month}...`);
  const { html, csv, totalIncome, totalExpense } = await generateMonthlyReport(month);

  if (totalIncome === 0 && totalExpense === 0) {
    console.log('No transactions this month, skipping email.');
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: REPORT_EMAIL,
    subject: `Finance Report — ${month} | Expenses: ₹${totalExpense.toLocaleString('en-IN')}`,
    html,
    attachments: [{
      filename: `finance_report_${month}.csv`,
      content: csv
    }]
  });

  console.log(`✅ Monthly report sent to ${REPORT_EMAIL}`);
}

// Run at 11:55 PM on the last day of every month
// "55 23 28-31 * *" with a check for actual last day
cron.schedule('55 23 28-31 * *', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  // Only send if tomorrow is a new month
  if (tomorrow.getDate() === 1) {
    sendMonthlyReport().catch(err => console.error('Email report error:', err));
  }
});

console.log('📅 Monthly email report scheduled (last day of month, 11:55 PM)');

module.exports = { sendMonthlyReport };
