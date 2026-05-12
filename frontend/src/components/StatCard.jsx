import React from 'react';
import clsx from 'clsx';

export default function StatCard({ label, value, sub, icon, trend, color = 'electric', className }) {
  const colors = {
    electric: 'text-electric bg-electric/10 border-electric/20',
    crimson:  'text-crimson  bg-crimson/10  border-crimson/20',
    amber:    'text-amber    bg-amber/10    border-amber/20',
    emerald:  'text-emerald  bg-emerald/10  border-emerald/20',
    neon:     'text-neon     bg-neon/10     border-neon/20',
  };
  const textColor = {
    electric: 'text-electric',
    crimson:  'text-crimson',
    amber:    'text-[#F4A261]',
    emerald:  'text-[#2A9D8F]',
    neon:     'text-neon',
  };

  return (
    <div className={clsx('card p-5 group', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">{label}</p>
        {icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border', colors[color])}>
            {icon}
          </div>
        )}
      </div>
      <div className={clsx('text-3xl font-display font-bold counter', textColor[color])}>{value}</div>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
      {trend !== undefined && (
        <p className={clsx('text-xs mt-2', trend >= 0 ? 'text-crimson' : 'text-emerald')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </p>
      )}
    </div>
  );
}
