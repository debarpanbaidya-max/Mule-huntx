import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Search, ChevronRight, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

function RiskBar({ score }) {
  const color = score > 70 ? '#E63946' : score > 40 ? '#F4A261' : '#2A9D8F';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const KYC_STYLES = {
  verified: { color: '#2A9D8F', bg: 'rgba(42,157,143,0.1)', label: 'Verified' },
  pending:  { color: '#F4A261', bg: 'rgba(244,162,97,0.1)',  label: 'Pending'  },
  failed:   { color: '#E63946', bg: 'rgba(230,57,70,0.1)',   label: 'Failed'   },
};

export default function Accounts() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all'); // all | high | medium | low
  const [debouncedSearch, setDS]  = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDS(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users', { params: { search: debouncedSearch, limit: 100 } });
      setUsers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    if (filter === 'high')   return u.risk_score > 70;
    if (filter === 'medium') return u.risk_score > 40 && u.risk_score <= 70;
    if (filter === 'low')    return u.risk_score <= 40;
    return true;
  });

  const counts = {
    high:   users.filter(u => u.risk_score > 70).length,
    medium: users.filter(u => u.risk_score > 40 && u.risk_score <= 70).length,
    low:    users.filter(u => u.risk_score <= 40).length,
  };

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-white">Accounts</h1>
        <p className="text-xs text-gray-500 mt-0.5">{users.length} total accounts monitored</p>
      </div>

      {/* Filter strip */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {[
          { key: 'all',    label: 'All Accounts',   count: users.length, color: '#00D9FF' },
          { key: 'high',   label: 'High Risk',       count: counts.high,  color: '#E63946' },
          { key: 'medium', label: 'Medium Risk',     count: counts.medium, color: '#F4A261' },
          { key: 'low',    label: 'Low Risk',        count: counts.low,   color: '#2A9D8F' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === f.key
                ? 'text-white border-opacity-30'
                : 'text-gray-500 border-white/6 hover:border-white/15 hover:text-gray-300'
            }`}
            style={filter === f.key ? {
              background: `${f.color}15`,
              borderColor: `${f.color}35`,
              color: f.color,
            } : {}}>
            {f.label}
            <span className="ml-1.5 font-mono opacity-70">{f.count}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white/4 border border-white/8 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-electric/30 focus:bg-white/6 w-52 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6">
              {['Account', 'KYC Status', 'Risk Score', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length: 8}).map((_, i) => (
                <tr key={i} className="border-b border-white/4">
                  {Array.from({length: 6}).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500 text-sm">No accounts found</td></tr>
            ) : filtered.map(u => {
              const kyc = KYC_STYLES[u.kyc_status] || KYC_STYLES.pending;
              return (
                <tr key={u.id} className="border-b border-white/4 hover:bg-white/2 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${u.risk_score > 70 ? '#E63946' : u.risk_score > 40 ? '#F4A261' : '#2A9D8F'}15`,
                          border: `1px solid ${u.risk_score > 70 ? '#E63946' : u.risk_score > 40 ? '#F4A261' : '#2A9D8F'}25`,
                          color: u.risk_score > 70 ? '#E63946' : u.risk_score > 40 ? '#F4A261' : '#2A9D8F' }}>
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{u.full_name || '—'}</div>
                        <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ color: kyc.color, background: kyc.bg, border: `1px solid ${kyc.color}25` }}>
                      {kyc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <RiskBar score={u.risk_score} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      u.account_status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-500 bg-white/5'
                    }`}>
                      {u.account_status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {format(new Date(u.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/users/${u.id}`}
                      className="inline-flex items-center gap-1 text-xs text-electric opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
