import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import {
  ArrowLeft, Shield, AlertTriangle, Activity, Monitor,
  Globe, ArrowRight, ChevronDown, ChevronUp, Info
} from 'lucide-react';

function RiskGauge({ score }) {
  const color = score > 70 ? '#E63946' : score > 40 ? '#F4A261' : '#2A9D8F';
  const label = score > 70 ? 'HIGH RISK' : score > 40 ? 'MEDIUM RISK' : 'LOW RISK';
  const data = [{ value: score, fill: color }];

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
            startAngle={220} endAngle={-40} data={data} barSize={8}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.04)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-display font-bold counter" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className="text-xs font-mono font-bold mt-1 px-3 py-1 rounded-full"
        style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
        {label}
      </span>
    </div>
  );
}

function TxRow({ tx }) {
  const [open, setOpen] = useState(false);
  const isSent = tx.direction === 'sent';
  const rules = tx.triggered_rules || [];

  return (
    <div className="border-b border-white/4 last:border-0">
      <button className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/2 transition-colors text-left"
        onClick={() => rules.length && setOpen(!open)}>
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
          isSent ? 'bg-crimson/10' : 'bg-emerald/10'
        }`}>
          <ArrowRight className={`w-3 h-3 ${isSent ? 'text-crimson' : 'text-emerald-400 rotate-180'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-300">
            {isSent ? '→' : '←'} {tx.counterpart_name || tx.counterpart_email}
          </div>
          <div className="text-xs text-gray-600 font-mono">
            {format(new Date(tx.created_at), 'MMM d, HH:mm')}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono font-bold text-white">₹{parseFloat(tx.amount).toLocaleString()}</div>
          {tx.risk_score != null && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
              tx.decision === 'BLOCK' ? 'status-block' :
              tx.decision === 'REVIEW' ? 'status-review' : 'status-allow'
            }`}>{tx.decision}</span>
          )}
        </div>
        {rules.length > 0 && (
          <div className="ml-2 text-gray-600">
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        )}
      </button>
      {open && rules.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white/3 rounded-lg p-3 space-y-1.5">
            <div className="text-xs text-gray-500 font-mono mb-2">TRIGGERED RULES</div>
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-xs text-gray-300">{r.description || r.name}</span>
                <span className="ml-auto text-xs font-mono text-amber-400">+{r.weight}</span>
              </div>
            ))}
            <div className="border-t border-white/6 mt-2 pt-2 flex justify-between text-xs">
              <span className="text-gray-500">Total risk score</span>
              <span className={`font-mono font-bold ${tx.risk_score > 70 ? 'text-crimson' : tx.risk_score > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {tx.risk_score} pts
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/users/${id}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 border-2 border-electric rounded-full border-t-transparent animate-spin" />
    </div>
  );

  if (!data?.user) return (
    <div className="p-6 text-gray-500">Account not found.</div>
  );

  const { user, transactions = [], risk_history = [], graph } = data;
  const riskColor = user.risk_score > 70 ? '#E63946' : user.risk_score > 40 ? '#F4A261' : '#2A9D8F';

  // Top triggered rules across history
  const ruleCounts = {};
  for (const ra of risk_history) {
    for (const r of (ra.triggered_rules || [])) {
      const k = r.name || r.id;
      if (!ruleCounts[k]) ruleCounts[k] = { ...r, count: 0 };
      ruleCounts[k].count++;
    }
  }
  const topRules = Object.values(ruleCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      {/* Back */}
      <Link to="/users" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-electric transition-colors mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts
      </Link>

      {/* Header */}
      <div className="card p-5 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 80% 50%, ${riskColor}20, transparent 70%)` }} />
        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-display font-bold shrink-0"
            style={{ background: `${riskColor}15`, border: `2px solid ${riskColor}30`, color: riskColor }}>
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display font-bold text-white">{user.full_name || 'Unknown'}</h1>
            <div className="text-sm text-gray-400 font-mono">{user.email}</div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                user.kyc_status === 'verified' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                : user.kyc_status === 'failed' ? 'status-block'
                : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
              }`}>KYC: {user.kyc_status}</span>
              <span className="text-xs text-gray-500 font-mono">
                Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Risk Gauge */}
          <RiskGauge score={user.risk_score} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Transactions */}
        <div className="col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-electric" />
                Transaction History
              </h2>
              <span className="text-xs text-gray-500">{transactions.length} transactions</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {transactions.length === 0
                ? <p className="text-center py-8 text-gray-500 text-sm">No transactions found</p>
                : transactions.map(tx => <TxRow key={tx.id} tx={tx} />)
              }
            </div>
          </div>

          {/* Network connections */}
          {graph?.connected_users?.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-electric" />
                Network Connections
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {graph.connected_users.slice(0, 6).map((u, i) => (
                  <Link key={i} to={`/users/${u.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-colors border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-neon/20 flex items-center justify-center text-xs text-neon font-bold shrink-0">
                      {(u.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-300 truncate">{u.email || u.id}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Risk intel */}
        <div className="space-y-4">
          {/* Why flagged */}
          <div className="card p-4">
            <h2 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Why Flagged
            </h2>
            {topRules.length === 0
              ? <p className="text-xs text-gray-500">No triggered rules in history</p>
              : (
                <div className="space-y-2">
                  {topRules.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-mono bg-amber-400/10 text-amber-400 shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-200 font-medium">{r.description || r.name}</div>
                        <div className="text-xs text-gray-600 font-mono">
                          Triggered {r.count}x · +{r.weight}pts each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Device & IP */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-display font-semibold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-electric" />
              Device & IP Intel
            </h2>
            {transactions[0] && (
              <>
                <div className="bg-white/3 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs text-gray-500 font-mono mb-1">LAST DEVICE</div>
                  <div className="text-xs text-gray-300">{transactions[0].browser || 'Unknown'} / {transactions[0].os || 'Unknown'}</div>
                </div>
                <div className="bg-white/3 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs text-gray-500 font-mono mb-1">LAST IP</div>
                  <div className="text-xs text-gray-300 font-mono">{transactions[0].ip_address || 'N/A'}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{transactions[0].country_code}</span>
                    {transactions[0].is_proxy && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-crimson/10 text-crimson border border-crimson/20">PROXY</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Devices from graph */}
          {graph?.devices?.length > 0 && (
            <div className="card p-4">
              <div className="text-xs text-gray-500 font-mono mb-2">ALL KNOWN DEVICES</div>
              {graph.devices.map((d, i) => (
                <div key={i} className="text-xs text-gray-400 font-mono py-1 border-b border-white/4 last:border-0 truncate">
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
