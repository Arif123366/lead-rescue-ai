'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, Check, Sparkles, Zap, Building2, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl rescue-gradient flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-base">Lead Rescue AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg rescue-gradient text-white font-bold">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 flex-1">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold mb-4">
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Starter</h3>
            <p className="text-xs text-slate-400 mb-6">For small teams getting started</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $49 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 500 Leads / month</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1 Team Member seat</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> AI Lead Qualification</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Email Follow-up Automation</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Basic CRM Connectors</li>
            </ul>
            <Link href="/signup" className="w-full py-3 rounded-xl border border-slate-700 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Growth - Popular */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/20 border-2 border-rose-500 rounded-2xl p-8 flex flex-col relative shadow-xl">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Growth</h3>
            <p className="text-xs text-slate-400 mb-6">For scaling revenue teams</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $149 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> Up to 5,000 Leads / month</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> 5 Team Member seats</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> RAG Knowledge Base Retrieval</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> Email + WhatsApp Messaging</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> 48-Hour Idle Lead Rescue Alerts</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-rose-400" /> HubSpot, Salesforce &amp; Zoho Sync</li>
            </ul>
            <Link href="/signup" className="w-full py-3 rounded-xl rescue-gradient rescue-glow text-center text-xs font-bold text-white hover:opacity-95 transition-opacity">
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Enterprise</h3>
            <p className="text-xs text-slate-400 mb-6">For large enterprises &amp; agencies</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              $499 <span className="text-xs font-normal text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300 mb-8 flex-1">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Leads</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Seats &amp; Roles</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated RAG Custom Models</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Custom CRM &amp; API Integrations</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated Success Manager &amp; SLA</li>
            </ul>
            <Link href="/contact" className="w-full py-3 rounded-xl border border-slate-700 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI Inc. | <Link href="/privacy" className="hover:text-rose-400">Privacy</Link> | <Link href="/terms" className="hover:text-rose-400">Terms</Link>
      </footer>
    </div>
  );
}
