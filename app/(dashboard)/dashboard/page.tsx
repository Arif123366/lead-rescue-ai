'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import Link from 'next/link';
import {
  Users,
  Flame,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Plus,
  Upload,
  RefreshCw,
  Clock,
  Send,
  UserCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rescuingId, setRescuingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await apiFetch('/api/v1/reports/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickRescue = async (leadId: string, templateId?: string) => {
    setRescuingId(leadId);
    try {
      const res = await apiFetch('/api/v1/rescue/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          action_type: 'send_followup',
          template_id: templateId
        })
      });

      const json = await res.json();
      if (res.ok) {
        setToastMessage(`🚀 ${json.message}`);
        setTimeout(() => setToastMessage(''), 5000);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Rescue action error:', err);
    } finally {
      setRescuingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Flame className="w-10 h-10 text-rose-500 animate-bounce mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Loading Lead Rescue AI Dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const needsAttention = data?.needs_attention || [];
  const stageBreakdown = data?.stage_breakdown || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-8 overflow-y-auto">
          {/* Header & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Executive Command Dashboard
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-time AI lead qualification, CRM pipeline velocity, and lead recovery metrics.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/leads?action=new"
                className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </Link>
              <Link
                href="/leads?action=import"
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" /> Import CSV
              </Link>
              <button
                onClick={fetchDashboardData}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage('')} className="text-emerald-400 hover:underline">Dismiss</button>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{metrics.total_leads || 0}</div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-rose-400 font-semibold">{metrics.hot_leads || 0} Hot</span> • 
                <span className="text-amber-400 font-semibold">{metrics.warm_leads || 0} Warm</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Pipeline Value</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                ${(metrics.pipeline_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Active opportunity deal sum
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Conversion Rate</span>
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{metrics.conversion_rate || '0.0'}%</div>
              <div className="mt-2 text-[11px] text-slate-400">
                Won / Qualified Leads ratio
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">AI Follow-ups Sent</span>
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{metrics.ai_followups_sent || 0}</div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{metrics.appointments_scheduled || 0} Meetings Scheduled</span>
              </div>
            </div>
          </div>

          {/* PROMINENT NEEDS ATTENTION (LEAD RESCUE ALERTS) */}
          <div className="glass-panel p-6 rounded-3xl border border-rose-500/30 rescue-glow space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    Needs Attention — Lead Rescue Command
                  </h2>
                  <p className="text-xs text-rose-300/80">
                    High-value Hot & Warm leads with no contact in &gt; 48 hours. Autonomously flagged for immediate recovery.
                  </p>
                </div>
              </div>
              <Link
                href="/rescue"
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline"
              >
                Open Rescue Command <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {needsAttention.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400">🎉 Excellent! No leads are currently at risk of going cold.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {needsAttention.map((item: any) => (
                  <div
                    key={item.lead_id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-500/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/leads/${item.lead_id}`} className="font-bold text-sm text-white hover:text-rose-400 hover:underline">
                          {item.lead_name}
                        </Link>
                        <span className="text-xs text-slate-400">({item.company})</span>
                        <StatusBadge status={item.qualification_status} />
                        <ScoreBadge score={item.qualification_score} />
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-rose-400 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Idle for {item.hours_idle} hours
                        </span>
                        <span>Interest: <strong className="text-slate-200">{item.product_interest}</strong></span>
                        {item.deal_value > 0 && (
                          <span className="font-mono text-emerald-400 font-bold">
                            Est. Value: ${item.deal_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleQuickRescue(item.lead_id, item.recommended_template_id)}
                        disabled={rescuingId === item.lead_id}
                        className="px-3.5 py-2 rounded-xl rescue-gradient text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {rescuingId === item.lead_id ? 'Dispatching...' : '1-Click Rescue'}
                      </button>
                      <Link
                        href={`/leads/${item.lead_id}`}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                      >
                        Review Lead
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage Breakdown & Pipeline Velocity */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
              CRM Pipeline Stage Velocity & Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {stageBreakdown.map((stg: any) => (
                <div key={stg.name} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium truncate block">{stg.name}</span>
                  <div className="text-lg font-black text-white">{stg.count}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold truncate">
                    ${stg.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
