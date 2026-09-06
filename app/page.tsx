'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  ArrowRight, 
  Zap, 
  Bot, 
  BrainCircuit, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles,
  MessageSquare,
  BarChart3,
  Layers,
  ChevronRight,
  UserCheck,
  Building2
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Non-blocking background session check
    apiFetch('/api/v1/auth/me')
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setIsAuthenticated(true);
          setUserEmail(data.user.email);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white flex flex-col font-sans">
      {/* ─── Top Announcement Banner ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        <span>New: OpenAI GPT-4o &amp; RAG Knowledge Base Integration is Live!</span>
        <Link href="/signup" className="underline underline-offset-2 hover:opacity-90 transition-opacity font-bold ml-1">
          Try Free &rarr;
        </Link>
      </div>

      {/* ─── Navigation Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl rescue-gradient rescue-glow flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                Lead Rescue <span className="text-rose-500">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                AUTONOMOUS RECOVERY
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-rose-400 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-rose-400 transition-colors">How It Works</a>
            <Link href="/pricing" className="hover:text-rose-400 transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-rose-400 transition-colors">About</Link>
            <Link href="/docs" className="hover:text-rose-400 transition-colors">Docs</Link>
            <Link href="/contact" className="hover:text-rose-400 transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl rescue-gradient rescue-glow text-white text-xs font-bold flex items-center gap-2 hover:opacity-95 transition-opacity"
              >
                <UserCheck className="w-4 h-4" /> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-semibold hover:bg-slate-900 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 rounded-xl rescue-gradient rescue-glow text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-95 transition-opacity"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous AI Lead Qualification &amp; 48-Hour Idle Lead Recovery</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
            Never Lose a High-Intent <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-amber-400 bg-clip-text text-transparent">
              Sales Lead Again.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Lead Rescue AI automatically qualifies inbound prospects in under 60 seconds, retrieves context from your RAG Knowledge Base, executes automated multi-channel follow-ups, and recovers dormant leads before they buy from competitors.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl rescue-gradient rescue-glow text-white text-base font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
            >
              Start Free 14-Day Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#workflow"
              className="w-full sm:w-auto px-7 py-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-base font-semibold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
            >
              <BrainCircuit className="w-5 h-5 text-rose-400" /> Watch Live Demo
            </a>
          </div>

          {/* Social Proof Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-400 border-t border-slate-800/80 pt-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SOC2 &amp; GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>5-Minute Setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics & Impact Bar ─────────────────────────────────────────────── */}
      <section className="bg-slate-900/60 border-y border-slate-800/80 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-black text-white mb-1">$12.4M+</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Rescued</div>
          </div>
          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-black text-rose-400 mb-1">98.4%</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Qualification Accuracy</div>
          </div>
          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-black text-amber-400 mb-1">&lt; 60s</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Speed to Contact</div>
          </div>
          <div className="p-4">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 mb-1">4.2x</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion Velocity Rate</div>
          </div>
        </div>
      </section>

      {/* ─── Core Features Grid ───────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3">PRODUCT CAPABILITIES</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built for Modern High-Growth Sales &amp; Marketing Teams
          </h2>
          <p className="text-sm text-slate-400">
            Combine real-time LLM lead scoring, custom company knowledge RAG, and automated multi-channel messaging in one seamless platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-rose-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-5">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Autonomous AI Qualification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenAI-powered algorithms automatically score incoming leads (Hot, Warm, Cold) based on intent, budget, authority, and product urgency.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-5">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Semantic RAG Knowledge Base</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload company docs, pricing plans, and FAQs. Our RAG engine injects precise product context into every automated message.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Multi-Channel Follow-ups</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engage prospects across Email and WhatsApp automatically. Process incoming replies to detect intent or handle opt-outs.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-sky-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-5">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">48-Hour Idle Lead Rescue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic scanning identifies high-value leads with no activity in &gt;48 hours and triggers priority recovery campaigns.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Native CRM Connectors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sync seamlessly with HubSpot, Salesforce, Zoho, Pipedrive, and GoHighLevel. Automatically import and update contact stages.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Executive Analytics &amp; Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track conversion velocity, channel ROI, team member performance, and total rescued deal value in real-time dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Workflow Step-by-Step ────────────────────────────────────────────── */}
      <section id="workflow" className="bg-slate-900/40 border-y border-slate-800/80 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">HOW IT WORKS</div>
            <h2 className="text-3xl font-bold text-white">Automated Lead Recovery in 3 Simple Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative text-center p-6 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                1
              </div>
              <h4 className="text-base font-bold text-white mb-2">Connect Lead Sources</h4>
              <p className="text-xs text-slate-400">
                Plug in webhooks, Meta Lead Ads, website forms, or CRM connectors in under 5 minutes.
              </p>
            </div>

            <div className="relative text-center p-6 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                2
              </div>
              <h4 className="text-base font-bold text-white mb-2">Instant AI Scoring &amp; RAG</h4>
              <p className="text-xs text-slate-400">
                AI evaluates buyer intent, matches context from your knowledge base, and assigns scores.
              </p>
            </div>

            <div className="relative text-center p-6 bg-slate-950/60 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                3
              </div>
              <h4 className="text-base font-bold text-white mb-2">Autopilot Rescue &amp; Outreach</h4>
              <p className="text-xs text-slate-400">
                Tailored follow-ups dispatch instantly. Cold or idle leads get rescued before dropping off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action Section ───────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/30 rounded-3xl p-12 relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Stop Losing High-Value Deals?
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto mb-8">
            Join hundreds of revenue teams recovering lost leads with Lead Rescue AI. Setup takes 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl rescue-gradient rescue-glow text-white text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform"
            >
              Start Your Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              View Pricing Tiers
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Global Footer (Compliance & Links) ─────────────────────────────── */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800/80 py-12 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg rescue-gradient flex items-center justify-center text-white">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white">Lead Rescue AI</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed mb-4">
              Autonomous AI lead qualification, RAG knowledge retrieval, multi-channel outreach, and lead recovery platform.
            </p>
            <p className="text-slate-500 text-[11px]">
              &copy; {new Date().getFullYear()} Lead Rescue AI Inc. All rights reserved.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Product</h5>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-rose-400 transition-colors">Features</a></li>
              <li><Link href="/pricing" className="hover:text-rose-400 transition-colors">Pricing</Link></li>
              <li><Link href="/docs" className="hover:text-rose-400 transition-colors">Documentation</Link></li>
              <li><Link href="/about" className="hover:text-rose-400 transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Legal &amp; Trust</h5>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-rose-400 transition-colors font-medium">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-rose-400 transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link href="/privacy#gdpr" className="hover:text-rose-400 transition-colors">GDPR &amp; CCPA</Link></li>
              <li><Link href="/privacy#security" className="hover:text-rose-400 transition-colors">Security &amp; SOC2</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Support</h5>
            <ul className="space-y-2">
              <li><Link href="/contact" className="hover:text-rose-400 transition-colors">Contact Us</Link></li>
              <li><a href="mailto:support@leadrescue.ai" className="hover:text-rose-400 transition-colors">support@leadrescue.ai</a></li>
              <li><a href="mailto:privacy@leadrescue.ai" className="hover:text-rose-400 transition-colors">privacy@leadrescue.ai</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
