'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, LogOut, User, Building, Flame, ChevronDown, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchUserData = async () => {
    try {
      const res = await apiFetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrg(data.organization);
      }
    } catch (err) {
      console.error('Fetch user error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/v1/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchNotifications();

    // EventSource for Zero-Latency SSE Real-Time Stream
    let eventSource: EventSource | null = null;
    try {
      const sseBase = process.env.NEXT_PUBLIC_API_URL || '';
      eventSource = new EventSource(`${sseBase}/api/v1/notifications/stream`, { withCredentials: true });
      eventSource.addEventListener('notification', () => {
        fetchNotifications();
      });
    } catch (err) {
      console.warn('SSE EventSource fallback to polling:', err);
    }

    // Polling fallback
    const interval = setInterval(fetchNotifications, 15000);

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const markAsRead = async (id?: string) => {
    await apiFetch('/api/v1/notifications', {
      method: 'PUT',
      body: JSON.stringify(id ? { id } : { mark_all_read: true })
    });
    fetchNotifications();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand Logo & Org Info */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl rescue-gradient flex items-center justify-center p-1 rescue-glow group-hover:scale-105 transition-transform border border-cyan-400/40">
            <img
              src="/icon.png"
              alt="Lead Rescue AI"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
            />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight leading-none flex items-center gap-1">
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                Lead
              </span>
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Rescue <span className="text-cyan-300 font-extrabold">AI</span>
              </span>
            </div>
            <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 flex items-center gap-1 mt-0.5">
              <span>POWERED BY</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-black">
                XILXIL
              </span>
            </div>
          </div>
        </Link>

        {org && (
          <Link
            href="/settings?tab=billing"
            title="Manage Subscription Plans & Usage Limits"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
          >
            <Building className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium truncate max-w-[180px]">{org.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 group-hover:border-purple-500/50">
              {org.plan_name}
            </span>
          </Link>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full rescue-gradient text-white text-[11px] font-bold flex items-center justify-center rescue-glow animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto py-2 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        n.is_read
                          ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                          : 'bg-purple-950/30 border-purple-500/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-relaxed">{n.message}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.related_entity_id && (
                          <Link
                            href={n.type === 'LEAD_RESCUE_ALERT' ? '/rescue' : `/leads/${n.related_entity_id}`}
                            className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            View Lead <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-black flex items-center justify-center text-xs border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800/80">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-cyan-300 border border-cyan-500/20">
                    {user.role}
                  </span>
                </div>
                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" /> Settings & Team
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
