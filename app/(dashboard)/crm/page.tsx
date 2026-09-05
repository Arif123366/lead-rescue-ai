'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import Link from 'next/link';
import {
  Kanban,
  Plus,
  Settings,
  Flame,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function CrmPipelinePage() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Win / Loss Prompt Modal State
  const [moveModal, setMoveModal] = useState<{
    show: boolean;
    leadId: string;
    leadName: string;
    targetStageId: string;
    targetStageName: string;
    isWon: boolean;
    isLost: boolean;
  }>({
    show: false,
    leadId: '',
    leadName: '',
    targetStageId: '',
    targetStageName: '',
    isWon: false,
    isLost: false
  });

  const [dealValue, setDealValue] = useState('');
  const [reasonForLoss, setReasonForLoss] = useState('');

  // Stage Manager Modal State
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [isWonStage, setIsWonStage] = useState(false);
  const [isLostStage, setIsLostStage] = useState(false);

  const fetchPipeline = async () => {
    try {
      const res = await apiFetch('/api/v1/crm/pipeline');
      if (res.ok) {
        const json = await res.json();
        setPipeline(json.pipeline || []);
      }
    } catch (err) {
      console.error('Fetch pipeline error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const initiateStageMove = (lead: any, targetStage: any) => {
    if (targetStage.is_final_won || targetStage.is_final_lost) {
      setMoveModal({
        show: true,
        leadId: lead.id,
        leadName: lead.name,
        targetStageId: targetStage.id,
        targetStageName: targetStage.name,
        isWon: !!targetStage.is_final_won,
        isLost: !!targetStage.is_final_lost
      });
      setDealValue(lead.deal_value || '');
      setReasonForLoss(lead.reason_for_loss || '');
    } else {
      executeStageMove(lead.id, targetStage.id);
    }
  };

  const executeStageMove = async (leadId: string, targetStageId: string, value?: string, reason?: string) => {
    try {
      const res = await apiFetch('/api/v1/crm/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          target_stage_id: targetStageId,
          deal_value: value,
          reason_for_loss: reason
        })
      });

      if (res.ok) {
        setMoveModal({ ...moveModal, show: false });
        fetchPipeline();
      }
    } catch (err) {
      console.error('Move error:', err);
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    try {
      const res = await apiFetch('/api/v1/crm/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStageName,
          is_final_won: isWonStage,
          is_final_lost: isLostStage
        })
      });

      if (res.ok) {
        setNewStageName('');
        setIsWonStage(false);
        setIsLostStage(false);
        setShowStageModal(false);
        fetchPipeline();
      }
    } catch (err) {
      console.error('Create stage error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-xs font-semibold text-slate-400">Loading Smart CRM Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Smart CRM Pipeline
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Visual sales pipeline board. Drag or shift leads across stages with win/loss value tracking.
              </p>
            </div>

            <button
              onClick={() => setShowStageModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" /> Manage Pipeline Stages
            </button>
          </div>

          {/* Kanban Board Horizontal Scroll Container */}
          <div className="flex-1 overflow-x-auto pb-6">
            <div className="flex items-start gap-4 min-w-[1200px]">
              {pipeline.map((col: any, index: number) => {
                const stage = col.stage;
                const leads = col.leads || [];

                return (
                  <div
                    key={stage.id}
                    className="w-80 flex-shrink-0 glass-panel rounded-2xl border border-slate-800/80 p-4 space-y-3 flex flex-col max-h-[calc(100vh-220px)]"
                  >
                    {/* Stage Column Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-white">{stage.name}</h3>
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                            {leads.length}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold block mt-0.5">
                          ${Number(col.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {stage.is_final_won && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {stage.is_final_lost && <XCircle className="w-4 h-4 text-rose-400" />}
                    </div>

                    {/* Lead Cards List */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {leads.length === 0 ? (
                        <div className="p-6 text-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl">
                          No leads in stage
                        </div>
                      ) : (
                        leads.map((lead: any) => (
                          <div
                            key={lead.id}
                            className="glass-card glass-card-hover p-4 rounded-xl space-y-2.5 cursor-pointer relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-bold text-xs text-white hover:text-rose-400 hover:underline truncate"
                              >
                                {lead.name}
                              </Link>
                              <ScoreBadge score={Number(lead.qualification_score || 0)} />
                            </div>

                            <p className="text-[11px] text-slate-400 truncate">{lead.company || 'Individual Lead'}</p>
                            <p className="text-[10px] text-slate-300 font-medium truncate">{lead.product_interest}</p>

                            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/60">
                              <StatusBadge status={lead.qualification_status} />
                              <span className="font-mono text-emerald-400 font-bold">
                                ${Number(lead.deal_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Stage Move Controls */}
                            <div className="flex items-center justify-between pt-2">
                              {index > 0 ? (
                                <button
                                  onClick={() => initiateStageMove(lead, pipeline[index - 1].stage)}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center"
                                  title={`Move left to ${pipeline[index - 1].stage.name}`}
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              ) : <span />}

                              {index < pipeline.length - 1 && (
                                <button
                                  onClick={() => initiateStageMove(lead, pipeline[index + 1].stage)}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] flex items-center"
                                  title={`Move right to ${pipeline[index + 1].stage.name}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* WIN / LOSS PROMPT MODAL */}
      {moveModal.show && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Transitioning to &quot;{moveModal.targetStageName}&quot;
              </h3>
              <button onClick={() => setMoveModal({ ...moveModal, show: false })} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Lead: <strong className="text-white">{moveModal.leadName}</strong>
            </p>

            {moveModal.isWon && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Final Closed Deal Value ($)
                </label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {moveModal.isLost && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Loss
                </label>
                <textarea
                  value={reasonForLoss}
                  onChange={(e) => setReasonForLoss(e.target.value)}
                  placeholder="Competitor selected, timing issues, budget constraint..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs h-20 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <button
              onClick={() => executeStageMove(moveModal.leadId, moveModal.targetStageId, dealValue, reasonForLoss)}
              className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold"
            >
              Confirm Stage Update
            </button>
          </div>
        </div>
      )}

      {/* STAGE MANAGER MODAL */}
      {showStageModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Custom CRM Stage</h3>
              <button onClick={() => setShowStageModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Stage Name</label>
                <input
                  type="text"
                  required
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. Contract Negotiation"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isWonStage}
                    onChange={(e) => { setIsWonStage(e.target.checked); if (e.target.checked) setIsLostStage(false); }}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500"
                  />
                  <span>Designate as Closed Won Stage</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isLostStage}
                    onChange={(e) => { setIsLostStage(e.target.checked); if (e.target.checked) setIsWonStage(false); }}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500"
                  />
                  <span>Designate as Closed Lost Stage</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
              >
                Create Stage
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
