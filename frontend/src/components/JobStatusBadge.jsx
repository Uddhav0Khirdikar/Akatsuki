import React from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';

export const JobStatusBadge = ({ status, size = 'md' }) => {
  const isOpen = status === 'OPEN';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-bold px-3.5 py-1.5 gap-2',
  }[size] || 'text-xs font-semibold px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-300 ${sizeClasses} ${
        isOpen
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          : 'bg-red-950/40 border-red-500/30 text-red-400/80 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
      }`}
    >
      {isOpen ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>OPEN FOR ROLES</span>
        </>
      ) : (
        <>
          <Lock className="w-3.5 h-3.5 text-red-400" />
          <span>CLOSED / FILLED</span>
        </>
      )}
    </span>
  );
};

export default JobStatusBadge;
