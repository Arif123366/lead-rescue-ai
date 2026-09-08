'use client';
import { apiFetch } from '@/lib/api-client';
import { AuthFooter } from '@/components/auth/AuthFooter';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Lock, Mail, User, Building, ArrowRight, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          organization_name: organizationName,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization account.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-cyan-500 selection:text-slate-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-block group">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl rescue-gradient rescue-glow mb-4 p-2 border border-cyan-400/40 group-hover:scale-105 transition-transform">
            <img src="/icon.png" alt="Lead Rescue AI" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Create</span>
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Organization</span>
          </h2>
          <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-400 mt-1">
            POWERED BY <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">XILXIL</span>
          </p>
        </Link>
        <p className="mt-2 text-xs text-slate-400">
          Start your 14-day trial with Lead Rescue AI autonomous recovery
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="Sarah Jenkins"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Organization / Business Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="Acme Real Estate Group"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="sarah@acme.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 mt-6"
            >
              {loading ? 'Creating Organization...' : 'Create Account & Start Trial'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>

          <AuthFooter />
        </div>
      </div>
    </div>
  );
}
