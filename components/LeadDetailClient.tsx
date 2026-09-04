'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  Building,
  Mail,
  Phone,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react';

export function LeadDetailClient() {
  const params = useParams();
  const leadId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [schedulingAppt, setSchedulingAppt] = useState(false);
  const [apptNotes, setApptNotes] = useState('');
  const [apptTime, setApptTime] = useState('');

  const fetchLeadData = async () => {
    try {
      const res = await apiFetch(`/api/v1/leads/${leadId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Fetch lead detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    }
  }, [leadId]);

  const handleReQualify = async () => {
    setQualifying(true);
    try {
      const res = await apiFetch(`/api/v1/leads/${leadId}/qualify`, { method: 'POST' });
      if (res.ok) {
        fetchLeadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQualifying(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!customMessage.trim()) return;
    setSendingFollowup(true);

    try {
      const res = await apiFetch('/api/v1/followup-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          custom_message: customMessage
        })
      });

      if (res.ok) {
        setCustomMessage('');
        fetchLeadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingFollowup(false);
    }
  };

  const handleScheduleAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptTime) return;
    setSchedulingAppt(true);

    const startTime = new Date(apptTime).toISOString();
    const endTime = new Date(new Date(apptTime).getTime() + 60 * 60 * 1000).toISOString();

    try {
      const res = await apiFetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          start_time: startTime,
          end_time: endTime,
          notes: apptNotes
        })
      });

      if (res.ok) {
        setApptTime('');
        setApptNotes('');
        fetchLeadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingAppt(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-xs font-semibold text-slate-400">Loading Lead Intelligence Profile...</p>
      </div>
    );
  }

  const lead = data?.lead;
  const qualification = data?.qualification_result;
  const analysis = qualification?.analysis_data || {};
  const followups = data?.follow_up_messages || [];
  const appointments = data?.appointments || [];

  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-center">
        <p className="text-slate-400 text-sm">Lead record not found.</p>
        <Link href="/leads" className="text-rose-400 text-xs hover:underline mt-4 inline-block">Back to Leads</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-8 overflow-y-auto">
          {/* Top Breadcrumb & Action */}
          <div className="flex items-center justify-between">
            <Link href="/leads" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Leads
            </Link>

            <button
              onClick={handleReQualify}
              disabled={qualifying}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-rose-400 hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${qualifying ? 'animate-spin' : ''}`} />
              {qualifying ? 'Re-analyzing with AI...' : 'Re-run AI Qualification'}
            </button>
          </div>

          {/* Header Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-white">{lead.name || 'Unnamed Lead'}</h1>
                  <StatusBadge status={lead.qualification_status} />
                  <ScoreBadge score={lead.qualification_score} />
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lead.company || 'Individual / Unknown Company'}</span> • 
                  <span>Source: {lead.source_name || 'Manual'}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Estimated Opportunity Value</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {lead.deal_value ? `$${lead.deal_value.toLocaleString()}` : '$0.00'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{lead.email || 'No email specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{lead.phone || 'No phone specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Assigned Rep: <strong>{lead.assigned_user_name || 'Unassigned'}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* AI QUALIFICATION ANALYSIS CARD */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-rose-500/20 rescue-glow space-y-5">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-400" />
                    <h2 className="text-base font-bold text-white">AI Lead Qualification Analysis</h2>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Model: {qualification?.ai_model_used || 'GPT-4o'}</span>
                </div>

                {analysis.summary && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed font-medium">
                    &quot;{analysis.summary}&quot;
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[11px]">Customer Needs</span>
                    <p className="text-slate-200">{analysis.customer_needs || 'High intent for solutions.'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[11px]">Buying Intent & Urgency</span>
                    <p className="text-slate-200">{analysis.buying_intent || 'Immediate'} ({analysis.urgency || 'High'} Urgency)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[11px]">Estimated Budget</span>
                    <p className="text-emerald-400 font-mono font-bold">{analysis.budget || 'Flexible'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 font-semibold block text-[11px]">Product Fit</span>
                    <p className="text-slate-200">{analysis.product_interest || lead.product_interest}</p>
                  </div>
                </div>
              </div>

              {/* Follow-Up Communication History */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white text-sm">Automated Follow-Up History & Response Log</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {followups.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No automated follow-up messages sent yet.</p>
                  ) : (
                    followups.map((msg: any) => (
                      <div key={msg.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-indigo-400">{msg.channel} Follow-Up</span>
                          <span>{new Date(msg.sent_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200">{msg.message_content}</p>

                        {msg.response_content && (
                          <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
                            <span className="font-semibold block text-[10px] uppercase text-rose-400 mb-1">Inbound Response Received:</span>
                            &quot;{msg.response_content}&quot;
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Send AI Follow-Up Input */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Dispatch AI Follow-up Message</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Hi Alex, checking in regarding your office space query..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <button
                      onClick={handleSendFollowUp}
                      disabled={sendingFollowup || !customMessage.trim()}
                      className="px-4 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* APPOINTMENTS & QUICK ACTIONS */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Scheduled Meetings</h3>
                </div>

                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No upcoming appointments scheduled.</p>
                  ) : (
                    appointments.map((a: any) => (
                      <div key={a.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{new Date(a.start_time).toLocaleDateString()}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            {a.status}
                          </span>
                        </div>
                        <p className="text-slate-400">{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        {a.notes && <p className="text-slate-300 text-[11px] italic mt-1">&quot;{a.notes}&quot;</p>}
                      </div>
                    ))
                  )}
                </div>

                {/* Schedule Appointment Form */}
                <form onSubmit={handleScheduleAppt} className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <span className="font-semibold text-slate-300 block">Schedule New Meeting</span>
                  <input
                    type="datetime-local"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Meeting agenda notes..."
                    value={apptNotes}
                    onChange={(e) => setApptNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={schedulingAppt}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700"
                  >
                    Schedule & Send Invite
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
