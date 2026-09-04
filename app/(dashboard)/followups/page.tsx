'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import {
  MessageSquare,
  Plus,
  Zap,
  Mail,
  Smartphone,
  Edit2,
  Trash2,
  X,
  Code,
  CheckCircle2
} from 'lucide-react';

export default function FollowupsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [channel, setChannel] = useState<'Email' | 'WhatsApp'>('Email');
  const [daysIdle, setDaysIdle] = useState('2');
  const [targetStatus, setTargetStatus] = useState('Hot');

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch('/api/v1/followup-templates');
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    } catch (err) {
      console.error('Fetch templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !messageBody) return;

    try {
      const res = await apiFetch('/api/v1/followup-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message_body: messageBody,
          channel,
          trigger_conditions: {
            lead_status: targetStatus,
            days_since_last_contact_gt: parseInt(daysIdle, 10)
          },
          is_active: true
        })
      });

      if (res.ok) {
        setShowModal(false);
        setName('');
        setMessageBody('');
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await apiFetch(`/api/v1/followup-templates/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (tpl: any) => {
    try {
      const res = await apiFetch(`/api/v1/followup-templates/${tpl.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tpl.is_active })
      });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error(err);
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
                AI Follow-Up Templates & Trigger Sequences
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Configure automated email & WhatsApp communication templates with lead attribute placeholders and autonomous triggers.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Create Template
            </button>
          </div>


          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-500">
                No follow-up templates configured yet.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tpl.channel === 'WhatsApp' ? (
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Mail className="w-4 h-4 text-sky-400" />
                        )}
                        <h3 className="font-bold text-sm text-white">{tpl.name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(tpl)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                            tpl.is_active
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {tpl.is_active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed font-mono">
                      {tpl.message_body}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-rose-400" /> Trigger: {tpl.trigger_conditions?.lead_status || 'Any'} lead idle &gt; {tpl.trigger_conditions?.days_since_last_contact_gt || 2} days
                    </span>
                    <span className="font-semibold text-slate-300">{tpl.channel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Create Follow-Up Template</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hot Lead Urgent Re-engagement"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Email">Email Communication</option>
                  <option value="WhatsApp">WhatsApp Message</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Message Content Template</label>
                <textarea
                  required
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Enter message template content..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white h-24 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Trigger Target Status</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Hot">Hot Leads</option>
                    <option value="Warm">Warm Leads</option>
                    <option value="Cold">Cold Leads</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Days Uncontacted &gt;</label>
                  <input
                    type="number"
                    value={daysIdle}
                    onChange={(e) => setDaysIdle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
              >
                Save & Activate Template
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
