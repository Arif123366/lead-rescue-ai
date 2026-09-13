'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await apiFetch('/api/v1/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            if (isMounted) setIsAuthenticated(true);
            return;
          }
        }
        
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center selection:bg-cyan-500 selection:text-slate-950">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl rescue-gradient rescue-glow p-2 border border-cyan-400/40 animate-pulse flex items-center justify-center">
          <img src="/icon.png" alt="Lead Rescue AI" className="w-10 h-10 object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        </div>
        <p className="text-xs font-black tracking-wider uppercase text-cyan-300">Verifying Authentication Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 animate-pulse">
            <div className="w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Loading Lead Rescue AI Dashboard...</p>
        </div>
      }>
        <AuthGuard>{children}</AuthGuard>
      </Suspense>
    </ErrorBoundary>
  );
}

