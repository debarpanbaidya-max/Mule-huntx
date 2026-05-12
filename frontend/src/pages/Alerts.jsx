import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import { AlertTriangle, Clock, Filter, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

function RuleTag({ rule }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono"
      style={{ background: 'rgba(244,162,97,0.08)', border: '1px solid rgba(244,162,97,0.2)', color: '#F4A261' }}>
      {rule.name || rule.id}
      {rule.weight && <span className="opacity-60">+{rule.weight}</span>}
    </span>
  );
}

function AlertRow({ alert }) {
  const [open, setOpen] = useState(false);
  const rules = alert.triggered_rules || [];
  const isBlock = alert.decision === 'BLOCK';

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors text-left"
      >
        <div className={`shrink-0 w-2 h-2 rounded-full ${isBlock ? 'bg-crimson' : 'bg-amber-400'}`}
          style={{ boxShadow: `0 0 6px ${isBlock ? '#E63946' : '#F4A261'}` }} />

        <span className={`shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded ${isBlock ? 'status-block' : 'status-review'}`}>
          {alert.decision}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200">
            <span className="font-medium">{alert.from_name || alert.from_email}</span>
            <span className="text-gray-600 mx-2">→</span>
            <span>{alert.to_name || alert.to_email}</span>
          </div>
          <div className="text-xs text-gray-600 font-mono mt-0.5">
            {rules.slice(0, 2).map(r => r.name || r.id).join(' · ')}
            {rules.length > 2 && ` · +${rules.length - 2} more`}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-mono text-white">₹{parseFloat(alert.amount).toLocaleString()}</div>
          <div className="text-xs text-gray-600">{alert.risk_score}pts</div>
        </div>

        <div className="text-right text-xs text-gray-600 font-mono shrink-0 w-20">
          {format(new Date(alert.created_at), 'MMM d HH:mm')}
        </div>

        {open ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="bg-white/3 rounded-xl p-4 border border-white/6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">TRIGGERED RULES</span>
              <Link to={`/users/${alert.from_user_id}`}
                className="flex items-center gap-1 text-xs text-electric hover:underline">
                View Account <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {rules.length === 0
                ? <span className="text-xs text-gray-600">No rules recorded</span>
                : rules.map((r, i) => <RuleTag key={i} rule={r} />)
              }
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-600 font-mono mb-1">TX ID</div>
                <div className="text-gray-300 font-mono">#{alert.id}</div>
              </div>
              <div>
                <div className="text-gray-600 font-mono mb-1">RISK SCORE</div>
                <div className="font-mono font-bold" style={{ color: isBlock ? '#E63946' : '#F4A261' }}>
                  {alert.risk_score} / 100
                </div>
              </div>
              <div>
                <div className="text-gray-600 font-mono mb-1">TIMESTAMP</div>
                <div className="text-gray-300 font-mono">{format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/transaction/recent', { params: { limit: 50 } });
      const flagged = res.data.filter(t => t.decision === 'BLOCK' || t.decision === 'REVIEW');
      setAlerts(flagged);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 15000);
    return () => clearInterval(id);
  }, [load, autoRefresh]);

  const filtered = alerts.filter(a => {
    if (filter === 'block') return a.decision === 'BLOCK';
    if (filter === 'review') return a.decision === 'REVIEW';
    return true;
  });

  const blockCount = alerts.filter(a => a.decision === 'BLOCK').length;
  const reviewCount = alerts.filter(a => a.decision === 'REVIEW').length;

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-crimson" />
            Alerts
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time flagged transactions</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            autoRefresh
              ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8'
              : 'text-gray-500 border-white/8'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 pulse-dot' : 'bg-gray-600'}`} />
          {autoRefresh ? 'LIVE' : 'Paused'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-display font-bold counter" style={{ color: '#E63946' }}>{blockCount}</div>
          <div className="text-xs text-gray-500 mt-1">Blocked</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-display font-bold counter" style={{ color: '#F4A261' }}>{reviewCount}</div>
          <div className="text-xs text-gray-500 mt-1">Under Review</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-display font-bold counter text-white">{alerts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Flagged</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-3.5 h-3.5 text-gray-500" />
        {[
          { key: 'all', label: 'All', count: alerts.length },
          { key: 'block', label: 'BLOCK', count: blockCount },
          { key: 'review', label: 'REVIEW', count: reviewCount },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === f.key
                ? f.key === 'block' ? 'status-block' : f.key === 'review' ? 'status-review' : 'text-electric border-electric/30 bg-electric/8'
                : 'text-gray-500 border-white/6 hover:text-gray-300'
            }`}>
            {f.label} <span className="font-mono opacity-70 ml-1">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-electric rounded-full border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No alerts found</p>
          </div>
        ) : (
          filtered.map(a => <AlertRow key={a.id} alert={a} />)
        )}
      </div>
    </div>
  );
}
