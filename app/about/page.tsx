'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, Cpu, ShieldCheck, Users } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <BrandLogo size="sm" showTagline={false} className="sm:hidden" />
          <BrandLogo size="sm" showTagline={true} className="hidden sm:flex" />
          <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors py-2 touch-target">
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Back to </span>Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 sm:mb-4 tracking-tight">About Lead Rescue AI</h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-8 sm:mb-12 max-w-2xl leading-relaxed">
          We build autonomous AI agents that empower revenue teams to eliminate lead decay, accelerate CRM velocity, and recover high-intent prospects before they drop off.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all rounded-2xl p-5 sm:p-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 neon-cyan-glow">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Our Mission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Over 60% of inbound sales leads are lost due to slow response times and manual follow-up friction. Lead Rescue AI automates speed-to-lead and intelligence retrieval so sales representatives focus on closing deals.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/40 transition-all rounded-2xl p-5 sm:p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 neon-purple-glow">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Autonomous LLM &amp; RAG Technology</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leveraging advanced Retrieval-Augmented Generation (RAG) and OpenAI models, Lead Rescue AI delivers human-like intent scoring and context-aware messaging across Email and WhatsApp.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 sm:py-8 px-4 text-center text-xs text-slate-500 break-words">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved.
      </footer>
    </div>
  );
}
