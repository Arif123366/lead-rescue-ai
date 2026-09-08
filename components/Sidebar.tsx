'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Kanban,
  ShieldAlert,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['Organization Owner', 'Marketing Manager', 'Sales Representative'] },
  { label: 'Leads Management', icon: Users, href: '/leads', roles: ['Organization Owner', 'Marketing Manager', 'Sales Representative'] },
  { label: 'Smart CRM Pipeline', icon: Kanban, href: '/crm', roles: ['Organization Owner', 'Marketing Manager', 'Sales Representative'] },
  { label: 'Lead Rescue Alerts', icon: ShieldAlert, href: '/rescue', highlight: true, roles: ['Organization Owner', 'Sales Representative'] },
  { label: 'Appointments', icon: Calendar, href: '/appointments', roles: ['Organization Owner', 'Sales Representative'] },
  { label: 'AI Follow-Up Templates', icon: MessageSquare, href: '/followups', roles: ['Organization Owner', 'Marketing Manager', 'Sales Representative'] },
  { label: 'Reports & Analytics', icon: BarChart3, href: '/reports', roles: ['Organization Owner', 'Marketing Manager', 'Sales Representative'] },
  { label: 'Settings & Integrations', icon: Settings, href: '/settings', roles: ['Organization Owner', 'Marketing Manager'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('Organization Owner');

  useEffect(() => {
    apiFetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role) setUserRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  const filteredNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const getRoleBadge = () => {
    switch (userRole) {
      case 'Marketing Manager':
        return { label: 'Marketing Manager', icon: Briefcase, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/40' };
      case 'Sales Representative':
        return { label: 'Sales Representative', icon: UserCheck, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' };
      default:
        return { label: 'Organization Owner', icon: ShieldCheck, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-[calc(100vh-65px)] p-4 hidden md:block flex-shrink-0">
      <div className="space-y-1.5">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? item.highlight
                    ? 'rescue-gradient text-white font-bold rescue-glow'
                    : 'bg-gradient-to-r from-cyan-950/50 via-purple-950/30 to-slate-900 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : item.highlight
                  ? 'text-purple-400 hover:bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/50'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? (item.highlight ? 'text-white' : 'text-cyan-400') : item.highlight ? 'text-purple-400' : 'text-slate-400 group-hover:text-cyan-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>

      <div className={`mt-8 p-3.5 rounded-2xl border ${badge.color}`}>
        <div className="flex items-center gap-2 text-xs font-bold">
          <BadgeIcon className="w-4 h-4" />
          <span>{badge.label} Access</span>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
          {userRole === 'Organization Owner' && 'Full administrative access to billing, team management, and organization settings.'}
          {userRole === 'Marketing Manager' && 'Access focused on Lead Generation, Campaign Webhooks, and RAG Knowledge Base.'}
          {userRole === 'Sales Representative' && 'Access focused on Lead Qualification, CRM Pipeline, and Lead Rescue Follow-ups.'}
        </p>
      </div>
    </aside>
  );
}
