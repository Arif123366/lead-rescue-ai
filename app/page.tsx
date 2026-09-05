'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check auth status via API and redirect accordingly
    apiFetch('/api/v1/auth/me')
      .then((res) => {
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl rescue-gradient rescue-glow mb-5 text-white animate-pulse">
          <Flame className="w-9 h-9" />
        </div>
        <p className="text-sm font-semibold text-slate-400 mt-3">Loading Lead Rescue AI...</p>
      </div>
    </div>
  );
}

