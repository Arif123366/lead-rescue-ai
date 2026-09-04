'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import Papa from 'papaparse';
import {
  Users,
  Search,
  Plus,
  Upload,
  Filter,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

export default function LeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    product_interest: '',
    deal_value: ''
  });
  const [formError, setFormError] = useState('');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const fetchLeads = async () => {
    try {
      let url = '/api/v1/leads?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await apiFetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead.');

      setShowAddModal(false);
      setNewLead({ name: '', email: '', phone: '', company: '', product_interest: '', deal_value: '' });
      toast.success('Lead created! AI qualification initiated.');
      fetchLeads();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvPreview(results.data.slice(0, 5));
        }
      });
    }
  };

  const handleImportSubmit = async () => {
    if (!csvFile) return;
    setImporting(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await apiFetch('/api/v1/leads/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data })
          });
          const json = await res.json();

          if (!res.ok) throw new Error(json.error);

          toast.success(json.message);
          setShowImportModal(false);
          setCsvFile(null);
          setCsvPreview([]);
          fetchLeads();
        } catch (err: any) {
          toast.error(`Import Error: ${err.message}`);
        } finally {
          setImporting(false);
        }
      }
    });
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
                Leads Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Centralized lead repository with AI qualification scores, status badges, and contact history.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" /> Import CSV
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name, company, email..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">All AI Statuses</option>
                <option value="Hot">Hot Leads</option>
                <option value="Warm">Warm Leads</option>
                <option value="Cold">Cold Leads</option>
                <option value="Pending">AI Qualification Pending</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No leads match your current search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">Lead Name / Company</th>
                      <th className="py-3.5 px-4">Product Interest</th>
                      <th className="py-3.5 px-4">AI Qualification</th>
                      <th className="py-3.5 px-4">CRM Stage</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-4">Est. Deal Value</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link href={`/leads/${lead.id}`} className="font-bold text-white hover:text-rose-400 hover:underline block">
                            {lead.name || 'Unnamed Lead'}
                          </Link>
                          <span className="text-[11px] text-slate-400">{lead.company || 'No Company'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium max-w-[200px] truncate">
                          {lead.product_interest || 'General'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={lead.qualification_status} />
                            <ScoreBadge score={lead.qualification_score} />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                            {lead.stage_name || 'New Lead'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {lead.source_name || 'Manual'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {lead.deal_value ? `$${lead.deal_value.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
                          >
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Lead Full Name</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="alex@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  placeholder="TechHorizon Solutions"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Interest / Service Needed</label>
                <input
                  type="text"
                  value={newLead.product_interest}
                  onChange={(e) => setNewLead({ ...newLead, product_interest: e.target.value })}
                  placeholder="e.g. Enterprise Office Lease / Commercial Software"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estimated Deal Value ($)</label>
                <input
                  type="number"
                  value={newLead.deal_value}
                  onChange={(e) => setNewLead({ ...newLead, deal_value: e.target.value })}
                  placeholder="50000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl rescue-gradient rescue-glow text-white font-semibold text-xs mt-4 hover:opacity-95"
              >
                Save & Run AI Qualification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Bulk Lead CSV Import</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Upload a CSV file containing lead records. Columns supported: <strong className="text-white">name, email, phone, company, product_interest, deal_value</strong>.
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs"
              />

              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-slate-300">CSV Preview (First 5 Rows):</span>
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-950 p-2 text-[11px] font-mono text-slate-300 border border-slate-800">
                    <pre>{JSON.stringify(csvPreview, null, 2)}</pre>
                  </div>
                </div>
              )}

              <button
                onClick={handleImportSubmit}
                disabled={!csvFile || importing}
                className="w-full py-2.5 px-4 rounded-xl rescue-gradient rescue-glow text-white font-semibold text-xs mt-2 disabled:opacity-50"
              >
                {importing ? 'Importing Leads...' : 'Initiate Bulk AI Qualification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
