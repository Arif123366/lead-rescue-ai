'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { AuthFooter } from '@/components/auth/AuthFooter';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800">
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
              placeholder="e.g. Sarah Jenkins"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Choose Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
              placeholder="At least 8 chars (A-Z, 0-9)"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
              placeholder="Re-enter password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3 px-4 rounded-xl rescue-gradient rescue-glow text-slate-950 font-black text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Joining Organization...' : 'Accept Invitation & Enter Dashboard'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-cyan-500 selection:text-slate-950">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
          <Link href="/" className="inline-block group">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl rescue-gradient rescue-glow mb-4 p-2 border border-cyan-400/40 group-hover:scale-105 transition-transform">
              <img src="/icon.png" alt="Lead Rescue AI" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Accept</span>
              <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Invitation</span>
            </h1>
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-slate-400 mt-1">
              POWERED BY <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">XILXIL</span>
            </p>
          </Link>
          <p className="mt-2 text-xs text-slate-400">Set up your password to join your organization</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
          <Suspense fallback={<div className="text-center py-8 text-xs text-slate-400">Loading invitation...</div>}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
