'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Zap, 
  Bot, 
  BrainCircuit, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  MessageSquare,
  BarChart3,
  Layers,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { BrandLogo } from '@/components/BrandLogo';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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

  // Prevent background scrolling and handle ESC key when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950 flex flex-col font-sans overflow-x-hidden w-full">
      {/* ─── Top Announcement Banner ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-600 via-purple-600 to-fuchsia-600 text-white text-xs font-semibold py-2 px-3 sm:px-4 text-center flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 leading-snug">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-200 flex-shrink-0" />
        <span>New: OpenAI GPT-4o &amp; RAG Knowledge Base Integration is Live!</span>
        <Link 
          href="/signup" 
          className="underline underline-offset-2 hover:opacity-90 transition-opacity font-bold text-white whitespace-nowrap"
        >
          Try Free &rarr;
        </Link>
      </div>

      {/* ─── Navigation Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-6 py-3 sm:py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLogo size="md" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors py-1">Features</a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors py-1">How It Works</a>
            <Link href="/pricing" className="hover:text-cyan-400 transition-colors py-1">Pricing</Link>
            <Link href="/about" className="hover:text-cyan-400 transition-colors py-1">About</Link>
            <Link href="/docs" className="hover:text-cyan-400 transition-colors py-1">Docs</Link>
            <Link href="/contact" className="hover:text-cyan-400 transition-colors py-1">Contact</Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center gap-2 hover:opacity-95 transition-opacity"
              >
                <UserCheck className="w-4 h-4" /> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold hover:bg-slate-900 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 rounded-xl rescue-gradient rescue-glow text-slate-950 text-xs font-black flex items-center gap-1.5 hover:opacity-95 transition-opacity"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="mobile-nav-drawer"
            className="md:hidden p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors touch-target flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-cyan-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* ─── Mobile Slide-out Navigation Drawer ─────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-nav-drawer"
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-between"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative bg-slate-900 border-b border-slate-800 shadow-2xl p-5 pt-4 z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="py-4 space-y-1">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                How It Works
              </a>
              <Link
                href="/pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                About Us
              </Link>
              <Link
                href="/docs"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                Documentation
              </Link>
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors touch-target"
              >
                Contact Us
              </Link>
            </nav>

            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3.5 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-sm flex items-center justify-center gap-2 touch-target"
                >
                  <UserCheck className="w-4 h-4" /> Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3 px-4 rounded-xl border border-slate-700 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors touch-target flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3.5 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-sm text-center flex items-center justify-center gap-2 touch-target"
                  >
                    Start Free Trial <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-4 sm:right-10 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] sm:text-xs font-semibold mb-6 sm:mb-8 neon-cyan-glow max-w-full text-center leading-tight">
            <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Autonomous AI Lead Qualification &amp; 48-Hour Idle Lead Recovery</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5 sm:mb-6 fluid-hero-title">
            Never Lose a High-Intent <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Sales Lead Again.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-1 sm:px-0">
            Lead Rescue AI automatically qualifies inbound prospects in under 60 seconds, retrieves context from your RAG Knowledge Base, executes automated multi-channel follow-ups, and recovers dormant leads before they buy from competitors.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-10 sm:mb-14 w-full max-w-sm sm:max-w-none mx-auto">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl rescue-gradient rescue-glow text-slate-950 text-sm sm:text-base font-black flex items-center justify-center gap-2.5 hover:scale-105 transition-transform touch-target"
            >
              Start Free 14-Day Trial <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <a
              href="#workflow"
              className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-sm sm:text-base font-semibold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 touch-target"
            >
              <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 flex-shrink-0" /> Watch Live Demo
            </a>
          </div>

          {/* Social Proof Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 text-xs font-medium text-slate-400 border-t border-slate-800/80 pt-6 sm:pt-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="whitespace-nowrap">SOC2 &amp; GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="whitespace-nowrap">No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="whitespace-nowrap">5-Minute Setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics & Impact Bar ─────────────────────────────────────────────── */}
      <section className="bg-slate-900/60 border-y border-slate-800/80 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
          <div className="p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 whitespace-nowrap">$12.4M+</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">Pipeline Rescued</div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-cyan-400 mb-1 whitespace-nowrap">98.4%</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">AI Qualification Accuracy</div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-purple-400 mb-1 whitespace-nowrap">&lt; 60s</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">Avg Speed to Contact</div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 mb-1 whitespace-nowrap">4.2x</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">Conversion Velocity Rate</div>
          </div>
        </div>
      </section>

      {/* ─── Core Features Grid ───────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">PRODUCT CAPABILITIES</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 fluid-section-title">
            Built for Modern High-Growth Sales &amp; Marketing Teams
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Combine real-time LLM lead scoring, custom company knowledge RAG, and automated multi-channel messaging in one seamless platform.
          </p>
        </div>

        {/* 3-Tier Grid: Mobile (1-col) -> Tablet (2-col) -> Desktop (3-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-cyan-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Autonomous AI Qualification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenAI-powered algorithms automatically score incoming leads (Hot, Warm, Cold) based on intent, budget, authority, and product urgency.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-purple-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Semantic RAG Knowledge Base</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload company docs, pricing plans, and FAQs. Our RAG engine injects precise product context into every automated message.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-emerald-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Multi-Channel Follow-ups</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engage prospects across Email and WhatsApp automatically. Process incoming replies to detect intent or handle opt-outs.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-cyan-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">48-Hour Idle Lead Rescue</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic scanning identifies high-value leads with no activity in &gt;48 hours and triggers priority recovery campaigns.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-purple-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Native CRM Connectors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sync seamlessly with HubSpot, Salesforce, Zoho, Pipedrive, and GoHighLevel. Automatically import and update contact stages.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-fuchsia-500/40 transition-all flex flex-col">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center mb-4 sm:mb-5">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Executive Analytics &amp; Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track conversion velocity, channel ROI, team member performance, and total rescued deal value in real-time dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Workflow Step-by-Step ────────────────────────────────────────────── */}
      <section id="workflow" className="bg-slate-900/40 border-y border-slate-800/80 py-16 sm:py-20 md:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">HOW IT WORKS</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Automated Lead Recovery in 3 Simple Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="relative text-center p-5 sm:p-6 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-cyan-500/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm neon-cyan-glow">
                1
              </div>
              <h4 className="text-base font-bold text-white mb-2">Connect Lead Sources</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Plug in webhooks, Meta Lead Ads, website forms, or CRM connectors in under 5 minutes.
              </p>
            </div>

            <div className="relative text-center p-5 sm:p-6 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-purple-500/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm neon-purple-glow">
                2
              </div>
              <h4 className="text-base font-bold text-white mb-2">Instant AI Scoring &amp; RAG</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI evaluates buyer intent, matches context from your knowledge base, and assigns scores.
              </p>
            </div>

            <div className="relative text-center p-5 sm:p-6 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-fuchsia-500/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-400 font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                3
              </div>
              <h4 className="text-base font-bold text-white mb-2">Autopilot Rescue &amp; Outreach</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tailored follow-ups dispatch instantly. Cold or idle leads get rescued before dropping off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action Section ───────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 md:py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-purple-950/60 border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.1)]">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-4 fluid-section-title">
            Ready to Stop Losing High-Value Deals?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Join hundreds of revenue teams recovering lost leads with Lead Rescue AI. Setup takes 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl rescue-gradient rescue-glow text-slate-950 text-sm font-black flex items-center justify-center gap-2 hover:scale-105 transition-transform touch-target"
            >
              Start Your Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors touch-target flex items-center justify-center"
            >
              View Pricing Tiers
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Global Footer (Compliance & Links) ─────────────────────────────── */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800/80 py-10 sm:py-12 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10 sm:mb-12">
          <div className="col-span-1 sm:col-span-2">
            <div className="mb-3">
              <BrandLogo size="sm" showTagline={true} />
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed mb-4 mt-2 text-xs">
              Autonomous AI lead qualification, RAG knowledge retrieval, multi-channel outreach, and lead recovery platform.
            </p>
            <p className="text-slate-500 text-[11px]">
              &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Product</h5>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">Features</a></li>
              <li><Link href="/pricing" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">Pricing</Link></li>
              <li><Link href="/docs" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">Documentation</Link></li>
              <li><Link href="/about" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Legal &amp; Trust</h5>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-cyan-400 transition-colors font-medium py-0.5 inline-block">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors font-medium py-0.5 inline-block">Privacy Policy</Link></li>
              <li><Link href="/privacy#gdpr" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">GDPR &amp; CCPA</Link></li>
              <li><Link href="/privacy#security" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">Security &amp; SOC2</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider mb-3">Support</h5>
            <ul className="space-y-2">
              <li><Link href="/contact" className="hover:text-cyan-400 transition-colors py-0.5 inline-block">Contact Us</Link></li>
              <li><a href="mailto:support@leadrescue.ai" className="hover:text-cyan-400 transition-colors break-all break-anywhere py-0.5 inline-block">support@leadrescue.ai</a></li>
              <li><a href="mailto:privacy@leadrescue.ai" className="hover:text-cyan-400 transition-colors break-all break-anywhere py-0.5 inline-block">privacy@leadrescue.ai</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
