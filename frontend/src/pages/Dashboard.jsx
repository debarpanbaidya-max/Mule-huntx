import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Activity, AlertTriangle, Shield, TrendingUp,
  ArrowUpRight, Zap, RefreshCw, Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DECISION_COLORS = { BLOCK: '#E63946', REVIEW: '#F4A261', ALLOW: '#2A9D8F' };

function StatCard({ icon: Icon, label, value, sub, accent = '#00D9FF', trend }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10"
        style={{ background: accent, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        {trend != null && (
          <span className={`text-xs font-mono flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-crimson'}`}>
            <ArrowUpRight className="w-3 h-3" style={{ transform: trend < 0 ? 'rotate(90deg)' : '' }} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-white counter">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: accent }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-mono">{typeof p.value === 'number' && p.value > 1000
            ? `₹${(p.value/1000).toFixed(1)}K` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get('/api/analytics/dashboard');
      setData(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-electric rounded-full border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-electric/60">LOADING DASHBOARD</span>
      </div>
    </div>
  );

  const s = data?.summary || {};
  const rd = data?.risk_distribution || {};
  const pieData = [
    { name: 'Low Risk',    value: parseInt(rd.low_risk)    || 0, color: '#2A9D8F' },
    { name: 'Medium Risk', value: parseInt(rd.medium_risk) || 0, color: '#F4A261' },
    { name: 'High Risk',   value: parseInt(rd.high_risk)   || 0, color: '#E63946' },
  ];

  const vol = data?.daily_volume || [];
  const volFormatted = vol.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    volume: parseFloat(d.volume) || 0,
    blocked: parseInt(d.blocked) || 0,
    count: parseInt(d.tx_count) || 0,
  }));

  const formatINR = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L`
    : v >= 1000 ? `₹${(v/1000).toFixed(1)}K` : `₹${v}`;

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Fraud Intelligence Dashboard</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-electric border border-electric/20 hover:bg-electric/10 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Activity}
          label="Total Transactions (30d)"
          value={parseInt(s.total_transactions || 0).toLocaleString()}
          sub={`${formatINR(parseFloat(s.total_volume || 0))} volume`}
          accent="#00D9FF"
        />
        <StatCard
          icon={AlertTriangle}
          label="Blocked Transactions"
          value={parseInt(s.blocked_count || 0).toLocaleString()}
          sub={`${((s.blocked_count / s.total_transactions) * 100 || 0).toFixed(1)}% of total`}
          accent="#E63946"
        />
        <StatCard
          icon={Clock}
          label="Under Review"
          value={parseInt(s.review_count || 0).toLocaleString()}
          sub="Needs manual check"
          accent="#F4A261"
        />
        <StatCard
          icon={Zap}
          label="Avg Processing Time"
          value={`${Math.round(s.avg_processing_ms || 0)}ms`}
          sub="< 500ms target"
          accent="#2A9D8F"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Volume Chart */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display font-semibold text-white">Transaction Volume (14 days)</h2>
            <TrendingUp className="w-4 h-4 text-electric" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volFormatted}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9FF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00D9FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" name="Volume" stroke="#00D9FF" strokeWidth={1.5}
                fill="url(#volGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Pie */}
        <div className="card p-5">
          <h2 className="text-sm font-display font-semibold text-white mb-4">Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.85} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                  <span className="text-gray-400">{d.name}</span>
                </div>
                <span className="font-mono text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent Alerts */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display font-semibold text-white">Recent Alerts</h2>
            <Link to="/alerts" className="text-xs text-electric hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {(data?.recent_alerts || []).slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  a.decision === 'BLOCK' ? 'status-block' : 'status-review'
                }`}>{a.decision}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 truncate">
                    {a.from_name || a.from_email} → {a.to_name || a.to_email}
                  </div>
                  <div className="text-xs text-gray-600 font-mono">
                    {(a.triggered_rules || []).slice(0,2).map(r => r.name || r).join(', ')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-white">₹{parseFloat(a.amount).toLocaleString()}</div>
                  <div className="text-xs text-gray-600 font-mono">{a.risk_score}pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suspicious Users */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display font-semibold text-white">High Risk Accounts</h2>
            <Link to="/users" className="text-xs text-electric hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {(data?.suspicious_users || []).slice(0, 6).map(u => (
              <Link key={u.id} to={`/users/${u.id}`}
                className="flex items-center gap-2.5 py-2 border-b border-white/4 last:border-0 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: u.risk_score > 70 ? 'rgba(230,57,70,0.2)' : 'rgba(244,162,97,0.2)',
                    border: `1px solid ${u.risk_score > 70 ? 'rgba(230,57,70,0.3)' : 'rgba(244,162,97,0.3)'}` }}>
                  {(u.full_name || u.email || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 truncate">{u.full_name || u.email}</div>
                  <div className="text-xs text-gray-600 font-mono">KYC: {u.kyc_status}</div>
                </div>
                <div className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  u.risk_score > 70 ? 'risk-high' : 'risk-medium'
                }`}>{u.risk_score}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
