'use client';

import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
