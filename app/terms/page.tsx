'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, Shield, FileCheck, AlertTriangle, CreditCard, Scale } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl rescue-gradient flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-base">Lead Rescue AI</span>
          </Link>
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold w-fit mb-6">
          <Scale className="w-4 h-4" /> Legal Agreement
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Terms of Service</h1>
        <p className="text-xs text-slate-400 mb-10">Effective Date: September 6, 2026</p>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-rose-400" /> 1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or accessing Lead Rescue AI (&quot;Services&quot;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you have authority to bind that entity.
            </p>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" /> 2. Subscription Plans &amp; Billing
            </h2>
            <p className="mb-3">
              Services are billed on a recurring monthly subscription basis (Starter $49/mo, Growth $149/mo, Enterprise $499/mo). Payments are processed via Stripe or Payoneer.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
              <li>Subscriptions renew automatically unless cancelled prior to the renewal date.</li>
              <li>Overuse beyond plan lead limits may require plan upgrade.</li>
              <li>Refunds are evaluated in accordance with our 14-day customer satisfaction guarantee.</li>
            </ul>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-400" /> 3. Acceptable Use &amp; Anti-Spam
            </h2>
            <p className="mb-3">
              Lead Rescue AI must strictly be used for legitimate sales qualification, CRM management, and consensual B2B communications. Users must comply with CAN-SPAM, TCPA, and GDPR laws.
            </p>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-rose-500/20 text-xs text-slate-400">
              <strong>Prohibited:</strong> Sending unsolicited bulk spam, scraping illegal lists, or processing prohibited content. Accounts violating anti-spam policies will be immediately suspended.
            </div>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-400" /> 4. Service Level Agreement (SLA) &amp; Disclaimers
            </h2>
            <p>
              We target 99.9% application uptime. The Services are provided &quot;AS IS&quot; without warranties of any kind. Lead Rescue AI is not liable for indirect or consequential damages.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI Inc. All rights reserved. | <Link href="/privacy" className="hover:text-rose-400 underline">Privacy Policy</Link>
      </footer>
    </div>
  );
}
