'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Code2, Webhook, Zap, Shield, Key } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <BrandLogo size="sm" showTagline={false} className="sm:hidden" />
          <BrandLogo size="sm" showTagline={true} className="hidden sm:flex" />
          <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors py-2 touch-target">
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Back to </span>Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 flex-1 w-full">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold w-fit mb-4 neon-cyan-glow">
          <BookOpen className="w-4 h-4" /> DEVELOPER &amp; INTEGRATION GUIDE
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">Documentation &amp; API Reference</h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-8 sm:mb-10 max-w-2xl leading-relaxed">
          Complete guide to integrating Lead Rescue AI webhooks, RAG knowledge ingestion, and multi-tenant REST endpoints.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-12">
          <div className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <Webhook className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Inbound Webhooks</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                POST inbound lead payloads to instantly trigger automated qualification &amp; RAG retrieval.
              </p>
            </div>
            <code className="text-[11px] text-cyan-300 bg-slate-950 p-2.5 rounded-lg block font-mono border border-cyan-500/20 overflow-x-auto break-all">
              POST /api/v1/webhooks/lead-source/:id
            </code>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/40 transition-all rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <Code2 className="w-6 h-6 text-purple-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">RAG Knowledge Base</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Ingest semantic company documentation &amp; product FAQs to personalize AI outreach.
              </p>
            </div>
            <code className="text-[11px] text-purple-300 bg-slate-950 p-2.5 rounded-lg block font-mono border border-purple-500/20 overflow-x-auto break-all">
              POST /api/v1/rag/knowledge
            </code>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <Key className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Authentication</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Authenticate API requests using JWT Bearer headers or HTTP-Only session cookies.
              </p>
            </div>
            <code className="text-[11px] text-emerald-300 bg-slate-950 p-2.5 rounded-lg block font-mono border border-emerald-500/20 overflow-x-auto break-all">
              Authorization: Bearer &lt;token&gt;
            </code>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 sm:py-8 px-4 text-center text-xs text-slate-500 break-words">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved.
      </footer>
    </div>
  );
}
