import React from 'react';
import { Flame, Sparkles, Snowflake, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface BadgeProps {
  status?: string;
  score?: number;
  className?: string;
}

export function StatusBadge({ status, className = '' }: BadgeProps) {
  switch (status) {
    case 'Hot':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 rescue-glow ${className}`}>
          <Flame className="w-3.5 h-3.5 animate-pulse text-rose-400" />
          Hot Lead
        </span>
      );
    case 'Warm':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Warm Lead
        </span>
      );
    case 'Cold':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-300 border border-slate-600/30 ${className}`}>
          <Snowflake className="w-3.5 h-3.5 text-sky-400" />
          Cold Lead
        </span>
      );
    case 'Pending':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 ${className}`}>
          <Clock className="w-3.5 h-3.5 animate-spin text-sky-400" />
          AI Analyzing...
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
          {status || 'Unknown'}
        </span>
      );
  }
}

export function ScoreBadge({ score }: { score: number }) {
  let colorClass = 'bg-slate-800 text-slate-400 border-slate-700';
  if (score >= 75) colorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
  else if (score >= 45) colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
  else if (score > 0) colorClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-mono ${colorClass}`}>
      {score}/100
    </span>
  );
}
