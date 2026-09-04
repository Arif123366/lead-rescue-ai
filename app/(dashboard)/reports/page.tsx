'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Award,
  Filter,
  Calendar
} from 'lucide-react';

export default function ReportsPage() {
  const [sourcesReport, setSourcesReport] = useState<any[]>([]);
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      let sourcesUrl = '/api/v1/reports/lead-sources?';
      let salesUrl = '/api/v1/reports/sales-team?';

      if (fromDate) {
        sourcesUrl += `from=${fromDate}&`;
        salesUrl += `from=${fromDate}&`;
      }
      if (toDate) {
        sourcesUrl += `to=${toDate}&`;
        salesUrl += `to=${toDate}&`;
      }

      const [resSources, resSales] = await Promise.all([
        fetch(sourcesUrl),
        fetch(salesUrl)
      ]);

      if (resSources.ok) {
        const json = await resSources.json();
        setSourcesReport(json.sources_performance || []);
      }
      if (resSales.ok) {
        const json = await resSales.json();
        setSalesReport(json.sales_team_performance || []);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 space-y-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Reports & Executive Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Lead source conversion efficiency and sales team performance breakdown.
              </p>
            </div>

            {/* Date Range Picker */}
            <div className="glass-panel p-2 rounded-2xl border border-slate-800 flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4 text-slate-400 ml-2" />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={() => { setFromDate(''); setToDate(''); }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Lead Source Performance Report */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Target className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Lead Source Conversion & ROI Performance</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Lead Source</th>
                    <th className="py-3 px-4">Channel Type</th>
                    <th className="py-3 px-4">Total Captured</th>
                    <th className="py-3 px-4">Avg AI Score</th>
                    <th className="py-3 px-4">Hot / Warm Ratio</th>
                    <th className="py-3 px-4 text-right">Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">Loading lead source report...</td>
                    </tr>
                  ) : sourcesReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No lead source metrics recorded for this date range.</td>
                    </tr>
                  ) : (
                    sourcesReport.map((src) => (
                      <tr key={src.source_id} className="hover:bg-slate-900/50">
                        <td className="py-3.5 px-4 font-bold text-white">{src.source_name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{src.source_type}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{src.total_leads}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-rose-400">{src.avg_qualification_score}/100</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="text-rose-400 font-semibold">{src.hot_leads} Hot</span> / <span className="text-amber-400 font-semibold">{src.warm_leads} Warm</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          ${(src.total_deal_value || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Team Performance Leaderboard */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Sales Team Performance Leaderboard</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Sales Representative</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Leads</th>
                    <th className="py-3 px-4">Hot Leads Managed</th>
                    <th className="py-3 px-4">Total Pipeline Managed</th>
                    <th className="py-3 px-4">Deals Won</th>
                    <th className="py-3 px-4 text-right">Closed Won Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">Loading sales team leaderboard...</td>
                    </tr>
                  ) : salesReport.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">No sales team activity logged for this date range.</td>
                    </tr>
                  ) : (
                    salesReport.map((rep) => (
                      <tr key={rep.user_id} className="hover:bg-slate-900/50">
                        <td className="py-3.5 px-4 font-bold text-white">{rep.user_name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{rep.role}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{rep.assigned_leads}</td>
                        <td className="py-3.5 px-4 text-rose-400 font-bold">{rep.hot_leads_managed}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          ${(rep.total_pipeline_managed || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">{rep.deals_won} Won</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400">
                          ${(rep.revenue_closed || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
