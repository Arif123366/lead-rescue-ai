'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, BookOpen, Code2, Webhook, Zap, Shield, Key } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl rescue-gradient flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-base">Lead Rescue AI Docs</span>
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex-1">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold w-fit mb-4">
          <BookOpen className="w-4 h-4" /> DEVELOPER &amp; INTEGRATION GUIDE
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Documentation &amp; API Reference</h1>
        <p className="text-sm text-slate-400 mb-10 max-w-2xl">
          Complete guide to integrating Lead Rescue AI webhooks, RAG knowledge ingestion, and multi-tenant REST endpoints.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Webhook className="w-6 h-6 text-rose-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Inbound Webhooks</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              POST inbound lead payloads to instantly trigger automated qualification &amp; RAG retrieval.
            </p>
            <code className="text-[11px] text-rose-300 bg-slate-950 p-2 rounded-lg block font-mono">
              POST /api/v1/webhooks/lead-source/:id
            </code>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Code2 className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-2">RAG Knowledge Base</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Ingest semantic company documentation &amp; product FAQs to personalize AI outreach.
            </p>
            <code className="text-[11px] text-amber-300 bg-slate-950 p-2 rounded-lg block font-mono">
              POST /api/v1/rag/knowledge
            </code>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Key className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Authentication</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Authenticate API requests using JWT Bearer headers or HTTP-Only session cookies.
            </p>
            <code className="text-[11px] text-emerald-300 bg-slate-950 p-2 rounded-lg block font-mono">
              Authorization: Bearer &lt;token&gt;
            </code>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI Inc. All rights reserved.
      </footer>
    </div>
  );
}
