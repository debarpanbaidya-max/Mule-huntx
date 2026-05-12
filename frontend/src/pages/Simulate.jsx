import { useState } from 'react';
import api from '../utils/api';
import { Zap, ArrowRight, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const PRESETS = [
  {
    label: 'Normal Transfer',
    desc: 'Low-amount domestic transfer',
    color: '#2A9D8F',
    data: { amount: 5000, device_fingerprint: 'fp_normal_abc', device_browser: 'Chrome', device_os: 'Windows', ip_address: '192.168.1.100', ip_country: 'IN', ip_is_proxy: false },
  },
  {
    label: 'High Value + New IP',
    desc: 'Triggers R6: new IP with high amount',
    color: '#F4A261',
    data: { amount: 80000, device_fingerprint: 'fp_newip_xyz', device_browser: 'Firefox', device_os: 'Linux', ip_address: '203.0.113.99', ip_country: 'SG', ip_is_proxy: false },
  },
  {
    label: 'Proxy + High Amount',
    desc: 'VPN/proxy with suspicious amount',
    color: '#E63946',
    data: { amount: 150000, device_fingerprint: 'fp_proxy_red', device_browser: 'Tor Browser', device_os: 'Windows', ip_address: '172.16.0.255', ip_country: 'US', ip_is_proxy: true },
  },
  {
    label: 'Suspicious Pattern',
    desc: 'Multiple rule triggers expected',
    color: '#E63946',
    data: { amount: 95000, device_fingerprint: 'fp_shared_device_01', device_browser: 'Chrome', device_os: 'Android', ip_address: '198.51.100.5', ip_country: 'RU', ip_is_proxy: true },
  },
];

function DecisionBadge({ decision, score }) {
  const config = {
    BLOCK:  { icon: XCircle,       color: '#E63946', bg: 'rgba(230,57,70,0.12)',  border: 'rgba(230,57,70,0.3)',  label: 'BLOCKED' },
    REVIEW: { icon: AlertTriangle, color: '#F4A261', bg: 'rgba(244,162,97,0.12)', border: 'rgba(244,162,97,0.3)', label: 'REVIEW'  },
    ALLOW:  { icon: CheckCircle,   color: '#2A9D8F', bg: 'rgba(42,157,143,0.12)', border: 'rgba(42,157,143,0.3)', label: 'ALLOWED' },
  }[decision] || {};
  const Icon = config.icon;
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: config.bg, border: `2px solid ${config.border}`, boxShadow: `0 0 30px ${config.color}25` }}>
        {Icon && <Icon className="w-8 h-8" style={{ color: config.color }} />}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-center" style={{ color: config.color }}>{config.label}</div>
        <div className="text-sm text-gray-400 text-center mt-1">
          Risk Score: <span className="font-mono font-bold text-white">{Math.min(score, 100)}</span>/100
        </div>
      </div>
    </div>
  );
}

function RiskMeter({ score }) {
  const capped = Math.min(score, 100);
  const color = capped > 70 ? '#E63946' : capped > 40 ? '#F4A261' : '#2A9D8F';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Risk Score</span>
        <span className="font-mono" style={{ color }}>{capped}/100</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${capped}%`, background: `linear-gradient(90deg, #2A9D8F, ${color})` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>ALLOW</span><span>REVIEW</span><span>BLOCK</span>
      </div>
    </div>
  );
}

// Safe profiles — 65% of time
const SAFE_PROFILES = [
  { amount: 1000,  device_fingerprint: 'fp_regular_01', device_browser: 'Chrome',  device_os: 'Windows', ip_address: '192.168.1.10', ip_country: 'IN', ip_is_proxy: false },
  { amount: 2500,  device_fingerprint: 'fp_regular_02', device_browser: 'Safari',  device_os: 'macOS',   ip_address: '192.168.1.20', ip_country: 'IN', ip_is_proxy: false },
  { amount: 5000,  device_fingerprint: 'fp_regular_03', device_browser: 'Chrome',  device_os: 'Android', ip_address: '192.168.1.30', ip_country: 'IN', ip_is_proxy: false },
  { amount: 3000,  device_fingerprint: 'fp_regular_04', device_browser: 'Firefox', device_os: 'Windows', ip_address: '10.0.0.10',    ip_country: 'IN', ip_is_proxy: false },
  { amount: 7500,  device_fingerprint: 'fp_regular_05', device_browser: 'Edge',    device_os: 'Windows', ip_address: '10.0.0.20',    ip_country: 'IN', ip_is_proxy: false },
  { amount: 4000,  device_fingerprint: 'fp_regular_06', device_browser: 'Chrome',  device_os: 'iOS',     ip_address: '192.168.2.10', ip_country: 'IN', ip_is_proxy: false },
  { amount: 8000,  device_fingerprint: 'fp_regular_07', device_browser: 'Safari',  device_os: 'iOS',     ip_address: '192.168.2.20', ip_country: 'IN', ip_is_proxy: false },
  { amount: 6000,  device_fingerprint: 'fp_regular_08', device_browser: 'Chrome',  device_os: 'Windows', ip_address: '192.168.3.10', ip_country: 'IN', ip_is_proxy: false },
  { amount: 2000,  device_fingerprint: 'fp_regular_09', device_browser: 'Firefox', device_os: 'Linux',   ip_address: '192.168.3.20', ip_country: 'IN', ip_is_proxy: false },
  { amount: 9000,  device_fingerprint: 'fp_regular_10', device_browser: 'Chrome',  device_os: 'Android', ip_address: '192.168.4.10', ip_country: 'IN', ip_is_proxy: false },
];

// Risky profiles — 35% of time
const RISKY_PROFILES = [
  { amount: 80000,  device_fingerprint: 'fp_shared_01',  device_browser: 'Chrome',      device_os: 'Windows', ip_address: '203.0.113.99', ip_country: 'SG', ip_is_proxy: false },
  { amount: 95000,  device_fingerprint: 'fp_shared_01',  device_browser: 'Tor Browser', device_os: 'Linux',   ip_address: '172.16.0.1',   ip_country: 'RU', ip_is_proxy: true  },
  { amount: 150000, device_fingerprint: 'fp_suspect_99', device_browser: 'Chrome',      device_os: 'Android', ip_address: '198.51.100.5', ip_country: 'CN', ip_is_proxy: true  },
  { amount: 120000, device_fingerprint: 'fp_shared_01',  device_browser: 'Firefox',     device_os: 'Windows', ip_address: '45.33.32.156', ip_country: 'NG', ip_is_proxy: false },
  { amount: 75000,  device_fingerprint: 'fp_mobile_77',  device_browser: 'Chrome',      device_os: 'Android', ip_address: '203.0.113.50', ip_country: 'BR', ip_is_proxy: true  },
];

export default function Simulate() {
  const [fromUser, setFromUser] = useState('1');
  const [toUser, setToUser]     = useState('2');
  const [form, setForm] = useState({
    amount: '25000',
    device_fingerprint: 'fp_test_abc123',
    device_browser: 'Chrome',
    device_os: 'Windows',
    ip_address: '192.168.1.100',
    ip_country: 'IN',
    ip_is_proxy: false,
  });
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);
  const [bulkCount, setBulkCount]   = useState(0);
  const [isBulking, setIsBulking]   = useState(false);

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const generateRandom = async () => {
    const fromId = Math.floor(Math.random() * 20) + 1;
    let toId = Math.floor(Math.random() * 20) + 1;
    while (toId === fromId) toId = Math.floor(Math.random() * 20) + 1;

    // 65% safe, 35% risky
    const isSafe  = Math.random() < 0.65;
    const profile = isSafe ? pick(SAFE_PROFILES) : pick(RISKY_PROFILES);

    setFromUser(String(fromId));
    setToUser(String(toId));
    setForm(profile);

    const res = await api.post('/api/transaction/validate', {
      from_user_id: fromId,
      to_user_id:   toId,
      ...profile,
    });

    const cappedScore = Math.min(res.data.risk_score, 100);
    const data = { ...res.data, risk_score: cappedScore };

    setResult(data);
    setHistory(h => [{
      ...data,
      timestamp: new Date(),
      amount:    profile.amount,
    }, ...h].slice(0, 20));

    return data;
  };

  const handleRandom = async () => {
    setLoading(true);
    setResult(null);
    try {
      await generateRandom();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async () => {
    setIsBulking(true);
    setBulkCount(0);
    let completed = 0;
    try {
      for (let i = 0; i < 20; i++) {
        try {
          await generateRandom();
          completed++;
          setBulkCount(completed);
        } catch (e) {
          console.error('Transaction failed:', e.message);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      setIsBulking(false);
      setBulkCount(0);
    }
  };

  const handleManual = async () => {
    if (!fromUser || !toUser) return alert('Enter both user IDs');
    if (fromUser === toUser) return alert('Cannot send to self');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/transaction/validate', {
        from_user_id: parseInt(fromUser),
        to_user_id:   parseInt(toUser),
        ...form,
        amount:      parseFloat(form.amount),
        ip_is_proxy: form.ip_is_proxy === true || form.ip_is_proxy === 'true',
      });
      const cappedScore = Math.min(res.data.risk_score, 100);
      const data = { ...res.data, risk_score: cappedScore };
      setResult(data);
      setHistory(h => [{ ...data, timestamp: new Date(), amount: form.amount }, ...h].slice(0, 20));
    } catch (e) {
      alert('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => setForm(f => ({ ...f, ...preset.data }));

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: '#00D9FF' }} />
          Simulate Transaction
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Auto-generate realistic transactions (65% safe · 35% suspicious)</p>
      </div>

      {/* AUTO GENERATE */}
      <div className="card p-5 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'linear-gradient(135deg, rgba(123,47,190,0.08), transparent)' }} />
        <div className="relative">
          <div className="text-xs text-gray-500 font-mono mb-1">AUTO GENERATE</div>
          <p className="text-xs text-gray-600 mb-4">
            Randomly picks user IDs and profiles — 65% normal, 35% suspicious. Auto-creates users and saves to database.
          </p>
          <div className="flex gap-3">
            <button onClick={handleRandom} disabled={loading || isBulking}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'rgba(123,47,190,0.15)', border: '1px solid rgba(123,47,190,0.4)', color: '#9B5FDE' }}>
              {loading
                ? <><div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: '#9B5FDE' }} /> Generating...</>
                : <><RefreshCw className="w-4 h-4" /> Random Transaction</>
              }
            </button>
            <button onClick={handleBulk} disabled={loading || isBulking}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', color: '#E63946' }}>
              {isBulking
                ? <><div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: '#E63946' }} /> {bulkCount}/20 done...</>
                : <><Zap className="w-4 h-4" /> Bulk Generate (20)</>
              }
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Manual form */}
        <div className="col-span-2 space-y-4">

          {/* Presets */}
          <div className="card p-4">
            <div className="text-xs text-gray-500 font-mono mb-3">QUICK PRESETS</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all hover:scale-[1.01]"
                  style={{ background: `${p.color}08`, borderColor: `${p.color}20` }}>
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: p.color }} />
                  <div>
                    <div className="text-xs font-medium text-white">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual accounts */}
          <div className="card p-5">
            <div className="text-xs text-gray-500 font-mono mb-4">MANUAL — ACCOUNTS</div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1.5 block">From User ID</label>
                <input type="number" value={fromUser}
                  onChange={e => setFromUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border font-mono focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#E8EAED' }}
                  placeholder="1" />
                <p className="text-xs text-gray-600 mt-1">Auto-created if doesn't exist</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 shrink-0 mt-4" />
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1.5 block">To User ID</label>
                <input type="number" value={toUser}
                  onChange={e => setToUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border font-mono focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#E8EAED' }}
                  placeholder="2" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs text-gray-400 mb-1.5 block">Amount (₹)</label>
              <input type="number" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border font-mono focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#E8EAED' }}
                placeholder="25000" />
            </div>
          </div>

          {/* Device & IP */}
          <div className="card p-5">
            <div className="text-xs text-gray-500 font-mono mb-4">DEVICE & IP METADATA</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'device_fingerprint', label: 'Device Fingerprint', placeholder: 'fp_abc123'     },
                { key: 'device_browser',     label: 'Browser',            placeholder: 'Chrome'        },
                { key: 'device_os',          label: 'OS',                 placeholder: 'Windows'       },
                { key: 'ip_address',         label: 'IP Address',         placeholder: '192.168.1.100' },
                { key: 'ip_country',         label: 'Country Code',       placeholder: 'IN'            },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-1.5 rounded-lg text-xs border font-mono focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#E8EAED' }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Proxy / VPN</label>
                <div className="flex items-center gap-3 pt-1.5">
                  {[true, false].map(v => (
                    <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="proxy"
                        checked={form.ip_is_proxy === v}
                        onChange={() => setForm(f => ({ ...f, ip_is_proxy: v }))} />
                      <span className="text-xs text-gray-300">{v ? 'Yes (Proxy)' : 'No'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleManual} disabled={loading || isBulking}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,217,255,0.15), rgba(123,47,190,0.15))',
              border: '1px solid rgba(0,217,255,0.3)',
              color: '#00D9FF',
            }}>
            {loading
              ? <><div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: '#00D9FF' }} /> Processing...</>
              : <><Zap className="w-4 h-4" /> Run Fraud Detection</>
            }
          </button>
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          <div className="card p-5 min-h-64">
            <div className="text-xs text-gray-500 font-mono mb-3">DETECTION RESULT</div>
            {result ? (
              <>
                <DecisionBadge decision={result.decision} score={result.risk_score} />
                <RiskMeter score={result.risk_score} />
                {result.triggered_rules?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 font-mono mb-2">TRIGGERED RULES</div>
                    <div className="space-y-2">
                      {result.triggered_rules.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono"
                            style={{ background: 'rgba(244,162,97,0.1)', color: '#F4A261', border: '1px solid rgba(244,162,97,0.2)' }}>
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-xs text-gray-200">{r.description || r.name}</div>
                            <div className="text-xs text-gray-600 font-mono">+{r.weight}pts · {r.source}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.triggered_rules?.length === 0 && (
                  <div className="mt-4 text-xs text-center py-2" style={{ color: '#2A9D8F' }}>
                    ✅ No suspicious rules triggered
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 font-mono">
                  <Clock className="w-3 h-3" />
                  {result.processing_time_ms}ms · TX #{result.transaction_id}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <Zap className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Run a transaction to see results</p>
                <p className="text-xs mt-1 text-gray-700">Use Auto Generate or fill the form</p>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card p-4">
              <div className="text-xs text-gray-500 font-mono mb-3">RECENT ({history.length})</div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/4 last:border-0">
                    <span className={`font-mono font-bold shrink-0 ${
                      h.decision === 'BLOCK'  ? 'text-red-400'   :
                      h.decision === 'REVIEW' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{h.decision}</span>
                    <span className="text-gray-500 font-mono">₹{parseFloat(h.amount).toLocaleString()}</span>
                    <span className="text-gray-600 ml-auto font-mono">{Math.min(h.risk_score, 100)}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}