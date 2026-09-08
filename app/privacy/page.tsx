'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <BrandLogo size="sm" showTagline={false} className="sm:hidden" />
          <BrandLogo size="sm" showTagline={true} className="hidden sm:flex" />
          <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors py-2 touch-target">
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Back to </span>Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold w-fit mb-4 sm:mb-6 neon-cyan-glow">
          <ShieldCheck className="w-4 h-4" /> GDPR &amp; CCPA Compliant
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-400 mb-8 sm:mb-10">Last Updated: September 6, 2026</p>

        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" /> 1. Overview &amp; Data Responsibility
            </h2>
            <p>
              Lead Rescue AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting the personal data of our SaaS users and their prospects. This Privacy Policy describes how we collect, store, process, and disclose information when you access our application at <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded break-all">https://leadrescueai.xilxil.com</code> and related API endpoints.
            </p>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> 2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li><strong>Account &amp; Auth Information:</strong> Name, email address, password hash, organization name, payment billing reference tokens.</li>
              <li><strong>Lead &amp; Prospect Data:</strong> Information imported by customer accounts (Name, Email, Phone, Company, Product Interest, Deal Value, CRM Stage).</li>
              <li><strong>Usage &amp; Telemetry:</strong> Log files, IP address, user agent, timestamps, API performance metrics.</li>
              <li><strong>RAG Knowledge Data:</strong> Custom product documentation, FAQs, and company context provided by users.</li>
            </ul>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> 3. How We Process &amp; Protect Data
            </h2>
            <p className="mb-3">
              We process data strictly to provide AI lead qualification, RAG retrieval, CRM synchronization, and automated follow-ups.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Encrypted in Transit &amp; At Rest</span>
                <span className="text-xs text-slate-400">All database records and network calls utilize AES-256 and TLS 1.3 encryption.</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-white font-bold block mb-1">Tenant Isolation</span>
                <span className="text-xs text-slate-400">PostgreSQL Row-Level Security (RLS) ensures organizations cannot access foreign lead records.</span>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-400" /> 4. Your Rights (GDPR &amp; CCPA)
            </h2>
            <p className="mb-2">Under applicable privacy regulations, users and data subjects maintain the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
              <li>Request an export copy of all stored personal lead data.</li>
              <li>Request full deletion (&quot;Right to be Forgotten&quot;) of lead profiles.</li>
              <li>Opt out of automated automated email/SMS contact sequences.</li>
            </ul>
          </section>

          <section id="security" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">5. Third-Party Sub-processors</h2>
            <p className="text-xs text-slate-400 mb-4">We partner with audited sub-processors to deliver services:</p>
            <div className="space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-800 pb-2 gap-0.5 sm:gap-2">
                <span className="font-bold text-white">OpenRouter / OpenAI</span>
                <span className="text-slate-400">LLM Lead Scoring &amp; Qualification</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-800 pb-2 gap-0.5 sm:gap-2">
                <span className="font-bold text-white">Supabase / PostgreSQL</span>
                <span className="text-slate-400">Encrypted Relational Data Storage</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-800 pb-2 gap-0.5 sm:gap-2">
                <span className="font-bold text-white">Resend</span>
                <span className="text-slate-400">Transactional Email Delivery</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-0.5 sm:gap-2">
                <span className="font-bold text-white">Stripe / Payoneer</span>
                <span className="text-slate-400">Payment Processing &amp; Billing</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 sm:py-8 px-4 text-center text-xs text-slate-500 break-words">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved. | <Link href="/terms" className="hover:text-cyan-400 underline">Terms of Service</Link>
      </footer>
    </div>
  );
}
