'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Filter,
  X
} from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');

  const fetchAppointments = async () => {
    try {
      let url = '/api/v1/appointments?';
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await apiFetch(url);
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.appointments || []);
      }
    } catch (err) {
      console.error('Fetch appointments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await apiFetch('/api/v1/leads');
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchLeads();
  }, [statusFilter]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !startTime) return;

    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    try {
      const res = await apiFetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          start_time: startIso,
          end_time: endIso,
          notes
        })
      });

      if (res.ok) {
        setShowModal(false);
        setSelectedLeadId('');
        setStartTime('');
        setNotes('');
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/v1/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) fetchAppointments();
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
                Appointments & Meeting Calendar
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Schedule sales calls, demo presentations, and site visits directly linked to lead records.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Schedule Appointment
            </button>
          </div>

          {/* Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Appointments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-400">Loading scheduled meetings...</div>
            ) : appointments.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-500">
                No scheduled appointments found.
              </div>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/leads/${appt.lead_id}`} className="font-bold text-sm text-white hover:text-rose-400 hover:underline block">
                        {appt.lead_name}
                      </Link>
                      <span className="text-[11px] text-slate-400">{appt.lead_company || 'Individual'}</span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        appt.status === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : appt.status === 'Cancelled'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{new Date(appt.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {appt.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      &quot;{appt.notes}&quot;
                    </p>
                  )}

                  {appt.status === 'Scheduled' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1 border border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, 'Cancelled')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 text-xs font-semibold border border-slate-800"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Schedule New Appointment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Lead</label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Select target lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.company || 'Individual'}) — Score: {l.qualification_score}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Meeting Agenda / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Discussion topics, site visit parameters..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white h-20 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl rescue-gradient rescue-glow text-white font-semibold mt-4"
              >
                Schedule & Auto-Update Stage
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
