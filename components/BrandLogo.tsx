'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BrandLogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  href = '/',
  size = 'md',
  showTagline = true,
  className = ''
}: BrandLogoProps) {
  const iconDimensions = {
    sm: { box: 'w-8 h-8', img: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', img: 36, text: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', img: 50, text: 'text-2xl', sub: 'text-xs' }
  }[size];

  const content = (
    <div className={`flex items-center gap-3 group select-none ${className}`}>
      {/* Icon with Glowing Border */}
      <div
        className={`${iconDimensions.box} rounded-xl rescue-gradient rescue-glow flex items-center justify-center p-1 group-hover:scale-105 transition-transform overflow-hidden relative border border-cyan-400/40`}
      >
        <img
          src="/icon.png"
          alt="Lead Rescue AI"
          className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
        />
      </div>

      {/* Typography */}
      <div>
        <div className={`${iconDimensions.text} font-black tracking-tight leading-none flex items-center gap-1`}>
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
            Lead
          </span>
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Rescue <span className="text-cyan-300 font-extrabold">AI</span>
          </span>
        </div>
        {showTagline && (
          <div className={`${iconDimensions.sub} font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-1 mt-0.5`}>
            <span>POWERED BY</span>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-black">
              XILXIL
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
