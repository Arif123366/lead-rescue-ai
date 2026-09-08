'use client';

import React from 'react';
import Link from 'next/link';

export function AuthFooter() {
  return (
    <footer className="mt-8 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-4 mb-2 font-medium">
        <Link href="/terms" className="hover:text-cyan-400 transition-colors">
          Terms of Service
        </Link>
        <span>&bull;</span>
        <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
          Privacy Policy
        </Link>
        <span>&bull;</span>
        <Link href="/contact" className="hover:text-cyan-400 transition-colors">
          Support &amp; Help
        </Link>
        <span>&bull;</span>
        <a href="mailto:support@leadrescue.ai" className="hover:text-cyan-400 transition-colors">
          Contact
        </a>
      </div>
      <p className="text-[11px] text-slate-600">
        &copy; {new Date().getFullYear()} Lead Rescue AI &bull; POWERED BY XILXIL. All rights reserved.
      </p>
    </footer>
  );
}

export default AuthFooter;
