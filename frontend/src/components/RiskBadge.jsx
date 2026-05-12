import React from 'react';
import clsx from 'clsx';

export function RiskBadge({ score }) {
  const level = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium',
      `risk-${level}`
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        level === 'high' ? 'bg-crimson' : level === 'medium' ? 'bg-amber' : 'bg-emerald'
      )} />
      {score}
    </span>
  );
}

export function DecisionBadge({ decision }) {
  const d = (decision || '').toLowerCase();
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wide',
      `status-${d}`
    )}>
      {decision}
    </span>
  );
}
