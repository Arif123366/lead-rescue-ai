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
    case 'HOT':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/40 neon-purple-glow ${className}`}>
          <Flame className="w-3.5 h-3.5 animate-pulse text-purple-400" />
          Hot Lead
        </span>
      );
    case 'Warm':
    case 'WARM':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 neon-cyan-glow ${className}`}>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Warm Lead
        </span>
      );
    case 'Cold':
    case 'COLD':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/60 text-slate-300 border border-slate-700/50 ${className}`}>
          <Snowflake className="w-3.5 h-3.5 text-slate-400" />
          Cold Lead
        </span>
      );
    case 'Pending':
    case 'PENDING':
    case 'PENDING_QUALIFICATION':
    case 'NEW':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 ${className}`}>
          <Clock className="w-3.5 h-3.5 animate-spin text-cyan-400" />
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
  if (score >= 75) colorClass = 'bg-purple-500/20 text-purple-200 border-purple-500/50 font-bold neon-purple-glow';
  else if (score >= 45) colorClass = 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 font-semibold neon-cyan-glow';
  else if (score > 0) colorClass = 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-mono ${colorClass}`}>
      {score}/100
    </span>
  );
}
