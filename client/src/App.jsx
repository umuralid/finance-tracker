import { useState, useEffect } from 'react';

const API = `${window.location.origin}/api`;
const EXPENSE_CATEGORIES = ['Rent', 'Groceries', 'Travel', 'Internet', 'EB', 'Loan', 'Parents', 'Medical', 'Credit Card', 'Hotel', 'Cricket', 'Petrol', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Other'];
const CAT_COLORS = { Rent: '#6366f1', Groceries: '#f59e0b', Travel: '#10b981', Internet: '#3b82f6', EB: '#ef4444', Loan: '#8b5cf6', Parents: '#ec4899', Medical: '#14b8a6', Petrol: '#f97316', Other: '#6b7280', Salary: '#10b981', Freelance: '#3b82f6' };

function formatCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 }); }

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isSignup ? '/signup' : '/login';
    const res = await fetch(API + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    onLogin(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <form onSubmit={submit} className="bg-[#1a1a1a] p-10 rounded-2xl w-96 space-y-5 border border-[#2a2a2a]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Finance Tracker</h2>
          <p className="text-sm text-[#888] mt-1">{isSignup ? 'Create your account' : 'Welcome back'}</p>
        </div>
        {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>}
        <input type="text" placeholder="Username" value={name} onChange={e => setName(e.target.value)} required
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-[#555] focus:outline-none focus:border-[#444] transition" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-[#555] focus:outline-none focus:border-[#444] transition" />
        <button type="submit" className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-[#e0e0e0] transition">
          {isSignup ? 'Sign Up' : 'Login'}
        </button>
        <p className="text-center text-sm text-[#666]">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }} className="text-white font-medium hover:underline">
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </form>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showIncome, setShowIncome] = useState(false);
  const [form, setForm] = useState({ type: 'expense', category: 'Groceries', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });
  const [reportFrom, setReportFrom] = useState(month + '-01');
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));

  const downloadReport = async () => {
    const res = await fetch(`${API}/transactions?user_id=${user.id}`);
    const all = await res.json();
    const filtered = all.filter(t => t.date >= reportFrom && t.date <= reportTo);
    const header = 'Date,Type,Category,Amount,Note\n';
    const rows = filtered.map(t => `${t.date},${t.type},${t.category},${t.amount},"${t.note}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report_${reportFrom}_to_${reportTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchAll = () => {
    fetch(`${API}/transactions?month=${month}&user_id=${user.id}`).then(r => r.json()).then(setTransactions);
    fetch(`${API}/summary?month=${month}`).then(r => r.json()).then(setSummary);
  };

  useEffect(() => { fetchAll(); }, [month]);

  const submit = (e) => {
    e.preventDefault();
    fetch(`${API}/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user_id: user.id, amount: parseFloat(form.amount) })
    }).then(() => { setForm(f => ({ ...f, amount: '', note: '' })); fetchAll(); });
  };

  const remove = (id) => fetch(`${API}/transactions/${id}`, { method: 'DELETE' }).then(fetchAll);

  const totalIncome = summary.filter(s => s.type === 'income').reduce((a, s) => a + s.total, 0);
  const totalExpense = summary.filter(s => s.type === 'expense').reduce((a, s) => a + s.total, 0);
  const myIncome = summary.filter(s => s.type === 'income' && s.user_id === user.id).reduce((a, s) => a + s.total, 0);
  const myExpense = summary.filter(s => s.type === 'expense' && s.user_id === user.id).reduce((a, s) => a + s.total, 0);
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const inputClass = "px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-[#444] transition";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold tracking-tight">Finance Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#888]">{user.name}</span>
            <button onClick={onLogout} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] transition">Logout</button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#888] uppercase tracking-wide">Income</p>
              <button onClick={() => setShowIncome(!showIncome)} className="text-[#555] hover:text-white transition">
                {showIncome ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 012.31-3.894M9.88 9.88a3 3 0 104.24 4.24M3 3l18 18"/></svg>
                )}
              </button>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{showIncome ? formatCurrency(myIncome) : '₹••••••'}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-xs text-[#888] uppercase tracking-wide mb-2">Expenses</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(myExpense)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-xs text-[#888] uppercase tracking-wide mb-2">Balance</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(myIncome - myExpense)}</p>
          </div>
        </div>

        {/* Spending Breakdown */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-medium text-[#888] uppercase tracking-wide mb-4">Spending Breakdown</h3>
          <div className="space-y-3">
            {EXPENSE_CATEGORIES.map(cat => {
              const spent = summary.filter(s => s.type === 'expense' && s.category === cat && s.user_id === user.id).reduce((a, s) => a + s.total, 0);
              if (spent === 0) return null;
              const pct = myExpense > 0 ? (spent / myExpense) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-[#aaa]">{cat}</span>
                  <div className="flex-1 bg-[#0f0f0f] rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[cat] }}></div>
                  </div>
                  <span className="text-sm font-medium w-24 text-right">{formatCurrency(spent)}</span>
                  <span className="text-xs text-[#555] w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            }).filter(Boolean)}
            {myExpense === 0 && <p className="text-[#555] text-sm">No expenses this month</p>}
          </div>
        </div>

        {/* Filters & Report */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} />
          <div className="h-4 w-px bg-[#2a2a2a]"></div>
          <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} className={inputClass} />
          <span className="text-[#555] text-sm">to</span>
          <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} className={inputClass} />
          <button type="button" onClick={downloadReport}
            className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#aaa] hover:text-white hover:border-[#444] transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"/></svg>
            Export CSV
          </button>
        </div>

        {/* Add Transaction */}
        <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-medium text-[#888] uppercase tracking-wide mb-4">Add Transaction</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: e.target.value === 'income' ? 'Salary' : 'Groceries' }))} className={inputClass}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Amount" value={form.amount} required min="1"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={`${inputClass} w-28`} />
            <input type="text" placeholder="Note (optional)" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={`${inputClass} w-40`} />
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
            <button type="submit" className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-[#e0e0e0] transition">Add</button>
          </div>
        </form>

        {/* Transactions */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-medium text-[#888] uppercase tracking-wide">Transactions</h3>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center px-5 py-4 hover:bg-[#151515] transition">
                <div className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: CAT_COLORS[t.category] || '#6b7280' }}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.category}</p>
                  <p className="text-xs text-[#555]">{t.date}{t.note ? ` · ${t.note}` : ''}</p>
                </div>
                <span className={`text-sm font-semibold mr-4 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <button onClick={() => remove(t.id)} className="text-[#333] hover:text-red-400 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            ))}
          </div>
          {transactions.length === 0 && <p className="p-8 text-center text-[#444] text-sm">No transactions this month</p>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem('user'); };

  if (!user) return <Login onLogin={login} />;
  return <Dashboard user={user} onLogout={logout} />;
}
