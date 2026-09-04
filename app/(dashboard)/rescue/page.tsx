'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import Link from 'next/link';
import {
  ShieldAlert,
  Flame,
  Clock,
  Send,
  Calendar,
  CheckCircle,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function LeadRescuePage() {
  const [atRiskLeads, setAtRiskLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoursThreshold, setHoursThreshold] = useState('48');
  const [rescuingId, setRescuingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchRescueScan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/rescue/scan?hours=${hoursThreshold}`);
      if (res.ok) {
        const json = await res.json();
        setAtRiskLeads(json.at_risk_leads || []);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRescueScan();
  }, [hoursThreshold]);

  const handleRescueAction = async (leadId: string, actionType: string, templateId?: string) => {
    setRescuingId(leadId);
    try {
      const res = await fetch('/api/v1/rescue/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          action_type: actionType,
          template_id: templateId
        })
      });

      const json = await res.json();
      if (res.ok) {
        setToastMessage(`⚡ ${json.message}`);
        setTimeout(() => setToastMessage(''), 5000);
        fetchRescueScan();
      }
    } catch (err) {
      console.error('Rescue action error:', err);
    } finally {
      setRescuingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
                Lead Rescue Command Center
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Autonomous recovery engine detecting high-value idle leads and executing instant re-engagement protocols.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">Idle Threshold:</span>
              <select
                value={hoursThreshold}
                onChange={(e) => setHoursThreshold(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="24">&gt; 24 Hours Idle</option>
                <option value="48">&gt; 48 Hours Idle (Standard)</option>
                <option value="72">&gt; 72 Hours Idle</option>
                <option value="96">&gt; 96 Hours Idle (Critical)</option>
              </select>

              <button
                onClick={fetchRescueScan}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Run Rescue Scan"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage('')} className="text-emerald-400 hover:underline">Dismiss</button>
            </div>
          )}

          {/* At-Risk Leads Container */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Scanning database for at-risk leads...</div>
            ) : atRiskLeads.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">All Leads Safely Engaged!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No Hot or Warm leads are currently uncontacted beyond the selected threshold of {hoursThreshold} hours.
                </p>
              </div>
            ) : (
              atRiskLeads.map((item) => (
                <div
                  key={item.lead_id}
                  className="glass-panel p-6 rounded-3xl border border-rose-500/30 rescue-glow space-y-4 hover:border-rose-500/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link href={`/leads/${item.lead_id}`} className="font-extrabold text-base text-white hover:text-rose-400 hover:underline">
                          {item.lead_name}
                        </Link>
                        <StatusBadge status={item.qualification_status} />
                        <ScoreBadge score={item.qualification_score} />
                      </div>

                      <p className="text-xs text-slate-400">
                        Company: <strong className="text-slate-200">{item.company}</strong> • Interest: <strong className="text-slate-200">{item.product_interest}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Idle Time</span>
                        <span className="text-sm font-extrabold text-rose-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {item.hours_idle} Hours
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Deal Value</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          ${item.deal_value ? item.deal_value.toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommended Recovery Action Box */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider flex items-center gap-1">
                        <Zap className="w-3 h-3" /> AI Recommended Recovery Protocol
                      </span>
                      <p className="text-xs font-semibold text-white">{item.recommended_action}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRescueAction(item.lead_id, 'send_followup', item.recommended_template_id)}
                        disabled={rescuingId === item.lead_id}
                        className="px-4 py-2 rounded-xl rescue-gradient text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {rescuingId === item.lead_id ? 'Executing...' : 'Execute AI Rescue'}
                      </button>

                      <button
                        onClick={() => handleRescueAction(item.lead_id, 'mark_contacted')}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                      >
                        Mark Contacted
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
