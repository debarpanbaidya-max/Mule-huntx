import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Network } from 'lucide-react';

function ForceGraph({ nodes, edges }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const posRef = useRef({});
  const velRef = useRef({});
  const animRef = useRef(null);

  useEffect(() => {
    if (!nodes.length) return;
    const W = 900, H = 600;
    const pos = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.min(W, H) * 0.3;
      pos[n.id] = { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;

    let frame = 0;
    const simulate = () => {
      if (frame++ > 300) return;
      const p = posRef.current;
      const v = velRef.current;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].id, b = nodes[j].id;
          if (!p[a] || !p[b]) continue;
          const dx = p[a].x - p[b].x, dy = p[a].y - p[b].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = 4000 / (d * d);
          v[a].x += f * dx / d; v[a].y += f * dy / d;
          v[b].x -= f * dx / d; v[b].y -= f * dy / d;
        }
      }

      edges.forEach(e => {
        if (!p[e.from] || !p[e.to]) return;
        const dx = p[e.to].x - p[e.from].x, dy = p[e.to].y - p[e.from].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 120) * 0.03;
        v[e.from].x += f * dx / d; v[e.from].y += f * dy / d;
        v[e.to].x -= f * dx / d; v[e.to].y -= f * dy / d;
      });

      nodes.forEach(n => {
        if (!p[n.id]) return;
        v[n.id].x += (W / 2 - p[n.id].x) * 0.005;
        v[n.id].y += (H / 2 - p[n.id].y) * 0.005;
        v[n.id].x *= 0.85; v[n.id].y *= 0.85;
        p[n.id].x = Math.max(40, Math.min(W - 40, p[n.id].x + v[n.id].x));
        p[n.id].y = Math.max(40, Math.min(H - 40, p[n.id].y + v[n.id].y));
      });

      setPositions({ ...p });
      animRef.current = requestAnimationFrame(simulate);
    };
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, edges.length]);

  const riskColor = (risk) => {
    if (risk > 70) return '#E63946';
    if (risk > 40) return '#F4A261';
    return '#2A9D8F';
  };

  return (
    <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 900 600">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(0,217,255,0.4)" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const from = positions[e.from], to = positions[e.to];
        if (!from || !to) return null;
        return (
          <line key={i}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={e.suspicious ? '#E63946' : 'rgba(0,217,255,0.2)'}
            strokeWidth={e.suspicious ? 1.5 : 1}
            strokeDasharray={e.suspicious ? '4,3' : undefined}
            markerEnd="url(#arrow)"
            opacity={0.7}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        const color = riskColor(n.risk_score || 0);
        const r = n.risk_score > 70 ? 18 : n.risk_score > 40 ? 15 : 12;
        return (
          <g key={n.id} transform={`translate(${pos.x},${pos.y})`} style={{ cursor: 'pointer' }}>
            <circle r={r + 6} fill={color} opacity={0.08} />
            <circle r={r} fill={`${color}22`} stroke={color} strokeWidth={1.5}
              filter={n.risk_score > 70 ? 'url(#glow)' : undefined} />
            <text y={1} textAnchor="middle" dominantBaseline="middle"
              fill={color} fontSize={9} fontFamily="JetBrains Mono" fontWeight="600">
              {(n.name || n.email || n.id || '?')[0].toUpperCase()}
            </text>
            <text y={r + 12} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.5)" fontSize={8} fontFamily="DM Sans">
              {(n.email || '').length > 14 ? (n.email || '').slice(0, 14) + '…' : (n.email || n.id)}
            </text>
            {n.risk_score > 70 && (
              <circle r={4} cx={r - 2} cy={-r + 2} fill="#E63946" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function GraphView() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rings, setRings] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/users', { params: { limit: 100 } }),
      api.get('/api/transaction/recent', { params: { limit: 200 } }),
      api.get('/api/analytics/mule-rings').catch(() => ({ data: { rings: [] } })),
    ]).then(([u, t, r]) => {
      setUsers(u.data);
      setTransactions(t.data);
      setRings(r.data.rings || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ringNodeIds = new Set(rings.flatMap(r => r.nodes || []));

  // All users shown with correct risk color
  const nodes = users.map(u => ({
    id:         String(u.id),
    email:      u.email,
    name:       u.full_name,
    risk_score: u.risk_score || 0,
    inRing:     ringNodeIds.has(String(u.id)),
  }));

  // Deduplicated edges
  const edgeSet = new Set();
  const edges = transactions
    .filter(t => {
      const key = `${t.from_user_id}-${t.to_user_id}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    })
    .map(t => ({
      from:       String(t.from_user_id),
      to:         String(t.to_user_id),
      suspicious: t.decision === 'BLOCK',
    }));

  const highRiskCount   = users.filter(u => u.risk_score > 70).length;
  const mediumRiskCount = users.filter(u => u.risk_score > 40 && u.risk_score <= 70).length;
  const lowRiskCount    = users.filter(u => u.risk_score <= 40).length;

  return (
    <div className="p-6 min-h-screen animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: '#00D9FF' }} />
            Graph Intelligence
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Transaction network & mule ring detection</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="text-xs px-3 py-1.5 rounded-lg border transition-all"
          style={{ borderColor: 'rgba(0,217,255,0.2)', color: '#00D9FF', background: 'rgba(0,217,255,0.05)' }}>
          Refresh Graph
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Accounts',     value: users.length,        color: '#00D9FF' },
          { label: 'Transactions', value: transactions.length,  color: '#7B2FBE' },
          { label: 'High Risk',    value: highRiskCount,        color: '#E63946' },
          { label: 'Mule Rings',   value: rings.length,         color: '#F4A261' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-xl font-display font-bold counter" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      <div className="flex items-center gap-6 mb-4 text-xs">
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-3 h-3 rounded-full" style={{ background: '#E63946' }} />
          High Risk &gt;70 <span className="font-mono text-red-400 ml-1">({highRiskCount})</span>
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-3 h-3 rounded-full" style={{ background: '#F4A261' }} />
          Medium Risk 40-70 <span className="font-mono text-amber-400 ml-1">({mediumRiskCount})</span>
        </span>
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="w-3 h-3 rounded-full" style={{ background: '#2A9D8F' }} />
          Low Risk &lt;40 <span className="font-mono text-emerald-400 ml-1">({lowRiskCount})</span>
        </span>
        <span className="flex items-center gap-2 text-gray-400">
          <span className="w-8 border-t border-dashed" style={{ borderColor: '#E63946' }} />
          Suspicious
        </span>
        <span className="flex items-center gap-2 text-gray-400">
          <span className="w-8 border-t" style={{ borderColor: 'rgba(0,217,255,0.4)' }} />
          Normal
        </span>
      </div>

      {/* Graph canvas */}
      <div className="card relative overflow-hidden" style={{ height: '520px' }}>
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,217,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-electric rounded-full border-t-transparent animate-spin"
                style={{ borderColor: '#00D9FF', borderTopColor: 'transparent' }} />
              <span className="text-xs font-mono" style={{ color: 'rgba(0,217,255,0.6)' }}>BUILDING GRAPH</span>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No graph data yet</p>
              <p className="text-xs mt-1">Run some transactions in Simulate page</p>
            </div>
          </div>
        ) : (
          <ForceGraph nodes={nodes} edges={edges} />
        )}
      </div>

      {/* Mule rings */}
      {rings.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-display font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#E63946', boxShadow: '0 0 6px #E63946' }} />
            Detected Mule Rings ({rings.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {rings.slice(0, 4).map((ring, i) => (
              <div key={i} className="card p-4" style={{ borderColor: 'rgba(230,57,70,0.2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono" style={{ color: '#E63946' }}>RING #{i + 1}</span>
                  <span className="text-xs text-gray-500">{ring.hops} hops</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {(ring.nodes || []).map((nid, j) => (
                    <span key={j} className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(230,57,70,0.1)', color: '#E63946', border: '1px solid rgba(230,57,70,0.2)' }}>
                      #{nid}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}