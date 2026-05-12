import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, GitBranch, Bell, PlayCircle, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/accounts',   icon: Users,            label: 'Accounts'     },
  { to: '/graph',      icon: GitBranch,        label: 'Graph View'   },
  { to: '/alerts',     icon: Bell,             label: 'Alerts'       },
  { to: '/simulate',   icon: PlayCircle,       label: 'Simulate'     },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      style={{ background: 'rgba(8,11,16,0.95)', borderRight: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#E63946,#7B2FBE)', boxShadow: '0 0 20px rgba(230,57,70,0.3)' }}>
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-display font-bold text-white leading-none">MuleDetect</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Fraud Intelligence</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mx-4 mb-4 px-3 py-2 rounded-lg flex items-center gap-2"
        style={{ background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.15)' }}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot flex-shrink-0" />
        <span className="text-xs" style={{ color: '#3BBDAD' }}>System Online</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                isActive
                  ? 'text-white'
                  : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, rgba(0,217,255,0.1), rgba(123,47,190,0.08))',
              border: '1px solid rgba(0,217,255,0.15)',
              color: 'var(--electric)',
            } : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? '' : 'group-hover:text-white transition-colors'} />
                <span className={`flex-1 font-medium ${isActive ? '' : 'group-hover:text-white transition-colors'}`}>{label}</span>
                {isActive && <ChevronRight size={14} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7B2FBE,#00D9FF)' }}>
                {user?.name?.[0] || 'D'}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || 'Demo User'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.role || 'analyst'}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Logout">
            <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
