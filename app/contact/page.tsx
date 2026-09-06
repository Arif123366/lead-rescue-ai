'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 flex-1">
        <h1 className="text-3xl font-extrabold text-white mb-2">Get in Touch</h1>
        <p className="text-xs text-slate-400 mb-8">
          Have a question about enterprise plans, custom RAG integrations, or technical support? Our team is here to help.
        </p>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Message Received!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Thank you for reaching out. A team member will respond to your inquiry at <strong className="text-white">{formData.email}</strong> within 4 business hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
              <input
                type="text"
                required
                placeholder="Enterprise Inquiry / Technical Support"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message</label>
              <textarea
                rows={5}
                required
                placeholder="Tell us about your team and requirement..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl rescue-gradient rescue-glow text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
            >
              <Send className="w-4 h-4" /> Send Message
            </button>
          </form>
        )}
      </main>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Lead Rescue AI Inc. All rights reserved.
      </footer>
    </div>
  );
}
