'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Sparkles, Zap, Building2, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" showTagline={true} />
          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold mb-4 neon-cyan-glow">
            <Sparkles className="w-3.5 h-3.5" /> TRANSPARENT PRICING
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
            Simple Plans for Teams of All Sizes
          </h1>
          <p className="text-sm text-slate-400">
            Recover lost revenue with automated AI qualification and 48-hour lead rescue. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Starter */}
          <div className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 transition-all rounded-2xl p-8 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Starter</h3>
            <p className="text-xs text-slate-400 mb-6">For small teams getting started</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $49 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Up to 500 Leads / month</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> 1 Team Member seat</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> AI Lead Qualification</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Email Follow-up Automation</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Basic CRM Connectors</li>
            </ul>
            <Link href="/signup" className="w-full py-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Growth - Popular */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/30 border-2 border-cyan-400/80 rounded-2xl p-8 flex flex-col relative shadow-[0_0_30px_rgba(0,240,255,0.15)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rescue-gradient text-slate-950 text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider shadow-md">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Growth</h3>
            <p className="text-xs text-slate-400 mb-6">For scaling revenue teams</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $149 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Up to 5,000 Leads / month</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> 5 Team Member seats</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> RAG Knowledge Base Retrieval</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Email + WhatsApp Messaging</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> 48-Hour Idle Lead Rescue Alerts</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> HubSpot, Salesforce &amp; Zoho Sync</li>
            </ul>
            <Link href="/signup" className="w-full py-3 rounded-xl rescue-gradient rescue-glow text-center text-xs font-black text-slate-950 hover:opacity-95 transition-opacity">
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 transition-all rounded-2xl p-8 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Enterprise</h3>
            <p className="text-xs text-slate-400 mb-6">For large enterprises &amp; agencies</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $499 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Unlimited Leads</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Unlimited Seats &amp; Roles</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Dedicated RAG Custom Models</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Custom CRM &amp; API Integrations</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Dedicated Success Manager &amp; SLA</li>
            </ul>
            <Link href="/contact" className="w-full py-3 rounded-xl border border-slate-700 hover:border-purple-500/50 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL | <Link href="/privacy" className="hover:text-cyan-400">Privacy</Link> | <Link href="/terms" className="hover:text-cyan-400">Terms</Link>
      </footer>
    </div>
  );
}
