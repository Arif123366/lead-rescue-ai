'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBadge, ScoreBadge } from '@/components/Badge';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { parseMultiFormatFile, exportLeadsMultiFormat, ExportFormat } from '@/lib/utils/multiFormatIO';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  FileSpreadsheet,
  FileText,
  FileType,
  AlertTriangle,
  CheckCircle2
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
  const [showExportModal, setShowExportModal] = useState(false);

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

  // Multi-Format Import State (.csv, .xlsx, .pdf)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileFormatInfo, setFileFormatInfo] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Export State
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const fetchLeads = async () => {
    try {
      let url = '/api/v1/leads?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await apiFetch(url);
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

    // Check URL parameters for direct modal triggers (e.g., from Dashboard)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'import') setShowImportModal(true);
      if (action === 'export') setShowExportModal(true);
      if (action === 'new') setShowAddModal(true);
    }
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

  const handleMultiFormatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setParsing(true);
    setImportError('');

    try {
      const rows = await parseMultiFormatFile(file);
      setParsedRows(rows);

      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      setFileFormatInfo(`${ext} document parsed successfully • ${rows.length} lead record(s) extracted.`);
    } catch (err: any) {
      console.error('Parsing error:', err);
      setImportError(err.message || 'Failed to parse file content.');
      setParsedRows([]);
      setFileFormatInfo('');
    } finally {
      setParsing(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile || parsedRows.length === 0) return;
    setImporting(true);
    setImportError('');

    try {
      const res = await apiFetch('/api/v1/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows })
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Import failed.');

      toast.success(`🎉 ${json.message || `Successfully imported ${parsedRows.length} leads!`}`);
      setShowImportModal(false);
      setImportFile(null);
      setParsedRows([]);
      setFileFormatInfo('');
      fetchLeads();
    } catch (err: any) {
      setImportError(`Import Error: ${err.message}`);
      toast.error(`Import Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleExportData = (format: ExportFormat) => {
    if (leads.length === 0) {
      toast.error('No lead records available to export.');
      return;
    }

    setExportingFormat(format);
    try {
      exportLeadsMultiFormat(leads, format, 'lead_rescue_export');
      toast.success(`Leads data exported as ${format.toUpperCase()} file successfully!`);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1 min-w-0">
        <Sidebar />

        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Leads Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Centralized lead repository with AI qualification scores, status badges, multi-format import/export, and contact history.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center gap-1.5 hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 hover:border-cyan-500/40 transition-all"
              >
                <Upload className="w-4 h-4 text-cyan-400" /> Import (.xlsx, .pdf, .csv)
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 hover:border-emerald-500/40 transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Export Data
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
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
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
                          <Link href={`/leads/${lead.id}`} className="font-bold text-white hover:text-cyan-400 hover:underline block">
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
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Interest / Service Needed</label>
                <input
                  type="text"
                  value={newLead.product_interest}
                  onChange={(e) => setNewLead({ ...newLead, product_interest: e.target.value })}
                  placeholder="e.g. Enterprise Office Lease / Commercial Software"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estimated Deal Value ($)</label>
                <input
                  type="number"
                  value={newLead.deal_value}
                  onChange={(e) => setNewLead({ ...newLead, deal_value: e.target.value })}
                  placeholder="50000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-xs mt-4 hover:opacity-95"
              >
                Save & Run AI Qualification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Format Import Modal (.xlsx, .pdf, .csv) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Import Lead Records</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Import lead batches directly into Lead Rescue AI. Supports <strong className="text-cyan-300">Excel (.xlsx, .xls)</strong>, <strong className="text-rose-300">PDF Documents (.pdf)</strong>, and <strong className="text-emerald-300">CSV Files (.csv)</strong>.
              </p>

              {/* Supported Formats Info Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium text-slate-300 text-[11px]">Excel Spreadsheet</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span className="font-medium text-slate-300 text-[11px]">PDF Document</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <FileType className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium text-slate-300 text-[11px]">CSV Data File</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Select File to Import</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleMultiFormatFileChange}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                />
              </div>

              {parsing && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Parsing and normalizing file data structure...</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {fileFormatInfo && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{fileFormatInfo}</span>
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>Parsed Preview (First 5 Rows):</span>
                    <span className="text-[11px] text-slate-400">{parsedRows.length} Total Lead(s)</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-950 p-2.5 text-[11px] font-mono text-slate-300 border border-slate-800">
                    <pre>{JSON.stringify(parsedRows.slice(0, 5), null, 2)}</pre>
                  </div>
                </div>
              )}

              <button
                onClick={handleImportSubmit}
                disabled={!importFile || parsedRows.length === 0 || importing}
                className="w-full py-2.5 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-xs mt-2 disabled:opacity-50 hover:opacity-95 transition-opacity"
              >
                {importing ? 'Importing Leads...' : `Initiate Bulk AI Qualification (${parsedRows.length} Leads)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Format Export Modal (.xlsx, .pdf, .csv) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 glass-panel bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Export Lead Data</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Download your lead records in your preferred file format. All exports include qualification scores, status badges, contact info, and deal values.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleExportData('xlsx')}
                  disabled={exportingFormat === 'xlsx'}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-left group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-emerald-300 transition-colors">Excel Workbook (.xlsx)</div>
                      <div className="text-[11px] text-slate-400">Formatted spreadsheet for Excel & Google Sheets</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </button>

                <button
                  onClick={() => handleExportData('pdf')}
                  disabled={exportingFormat === 'pdf'}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 flex items-center justify-between text-left group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-rose-300 transition-colors">Executive PDF Report (.pdf)</div>
                      <div className="text-[11px] text-slate-400">Landscape PDF report with automated table layout</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                </button>

                <button
                  onClick={() => handleExportData('csv')}
                  disabled={exportingFormat === 'csv'}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-left group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                      <FileType className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">Raw CSV File (.csv)</div>
                      <div className="text-[11px] text-slate-400">Formula-sanitized raw comma-separated values</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 text-center">
                Exporting {leads.length} lead record(s) currently loaded.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

