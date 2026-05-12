import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, AlertTriangle, Network,
  Zap, LogOut, Shield, ChevronLeft, ChevronRight, Bell
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/',            icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/users',       icon: <Users className="w-5 h-5" />,           label: 'Accounts' },
  { to: '/alerts',      icon: <AlertTriangle className="w-5 h-5" />,   label: 'Alerts' },
  { to: '/graph',       icon: <Network className="w-5 h-5" />,         label: 'Graph' },
  { to: '/simulate',    icon: <Zap className="w-5 h-5" />,             label: 'Simulate' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080B10]">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col border-r border-white/5 bg-[#0A0D12] transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-electric/10 border border-electric/20 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-electric" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-display font-bold text-base leading-none">MuleGuard</div>
              <div className="text-gray-600 text-[10px] font-mono mt-0.5">FRAUD INTEL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-electric/10 text-electric border border-electric/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-white/5 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-neon/20 border border-neon/30 flex items-center justify-center shrink-0 text-xs text-neon font-bold">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-medium truncate">{user?.name || 'Analyst'}</div>
                <div className="text-gray-600 text-[10px] truncate">{user?.email || ''}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-500 hover:text-crimson hover:bg-crimson/10 transition-all text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Sign out'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all text-sm"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
