'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" showTagline={true} />
          <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold w-fit mb-6 neon-cyan-glow">
          <ShieldCheck className="w-4 h-4" /> GDPR &amp; CCPA Compliant
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Privacy Policy</h1>
        <p className="text-xs text-slate-400 mb-10">Last Updated: September 6, 2026</p>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" /> 1. Overview &amp; Data Responsibility
            </h2>
            <p>
              Lead Rescue AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting the personal data of our SaaS users and their prospects. This Privacy Policy describes how we collect, store, process, and disclose information when you access our application at <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">https://leadrescueai.xilxil.com</code> and related API endpoints.
            </p>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> 2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li><strong>Account &amp; Auth Information:</strong> Name, email address, password hash, organization name, payment billing reference tokens.</li>
              <li><strong>Lead &amp; Prospect Data:</strong> Information imported by customer accounts (Name, Email, Phone, Company, Product Interest, Deal Value, CRM Stage).</li>
              <li><strong>Usage &amp; Telemetry:</strong> Log files, IP address, user agent, timestamps, API performance metrics.</li>
              <li><strong>RAG Knowledge Data:</strong> Custom product documentation, FAQs, and company context provided by users.</li>
            </ul>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> 3. How We Process &amp; Protect Data
            </h2>
            <p className="mb-3">
              We process data strictly to provide AI lead qualification, RAG retrieval, CRM synchronization, and automated follow-ups.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs mb-1">Multi-Tenant Isolation</div>
                <div className="text-xs text-slate-400">All database queries strictly partition data by organization ID to prevent unauthorized tenant access.</div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs mb-1">Encryption at Rest &amp; Transit</div>
                <div className="text-xs text-slate-400">All data in transit uses TLS 1.3 encryption. Passwords use bcrypt hashing with cost factor 12.</div>
              </div>
            </div>
          </section>

          <section id="gdpr" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-sky-400" /> 4. Your Rights (GDPR &amp; CCPA)
            </h2>
            <p className="mb-3">
              Under GDPR and CCPA, users have the right to access, rectify, export, or permanently delete their data. To request data deletion or an export, contact <a href="mailto:privacy@leadrescue.ai" className="text-rose-400 underline">privacy@leadrescue.ai</a>.
            </p>
          </section>

          <section id="security" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">5. Third-Party Sub-processors</h2>
            <p className="text-xs text-slate-400 mb-4">We partner with audited sub-processors to deliver services:</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">OpenRouter / OpenAI</span>
                <span className="text-slate-400">LLM Lead Scoring &amp; Qualification</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">Supabase / PostgreSQL</span>
                <span className="text-slate-400">Encrypted Relational Data Storage</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white">Resend</span>
                <span className="text-slate-400">Transactional Email Delivery</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="font-bold text-white">Stripe / Payoneer</span>
                <span className="text-slate-400">Payment Processing &amp; Billing</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved. | <Link href="/terms" className="hover:text-cyan-400 underline">Terms of Service</Link>
      </footer>
    </div>
  );
}
