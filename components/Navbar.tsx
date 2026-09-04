'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, LogOut, User, Building, Flame, ChevronDown, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
      const res = await fetch('/api/v1/auth/me');
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
      const res = await fetch('/api/v1/notifications');
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
      eventSource = new EventSource('/api/v1/notifications/stream');
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
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const markAsRead = async (id?: string) => {
    await fetch('/api/v1/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : { mark_all_read: true })
    });
    fetchNotifications();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand Logo & Org Info */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl rescue-gradient flex items-center justify-center text-white rescue-glow group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-rose-400 bg-clip-text text-transparent">
              Lead Rescue AI
            </span>
            <span className="block text-[10px] text-rose-400/90 uppercase tracking-widest font-semibold">
              Autonomous Recovery
            </span>
          </div>
        </Link>

        {org && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium truncate max-w-[180px]">{org.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {org.plan_name}
            </span>
          </div>
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
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-sm text-white">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
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
                          : 'bg-rose-950/40 border-rose-500/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-relaxed">{n.message}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.related_entity_id && (
                          <Link
                            href={n.type === 'LEAD_RESCUE_ALERT' ? '/rescue' : `/leads/${n.related_entity_id}`}
                            className="text-rose-400 hover:underline flex items-center gap-1"
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
              className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs border border-rose-500/30">
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
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" /> Sign Out
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
