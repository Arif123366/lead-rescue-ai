'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  LogOut, 
  User, 
  Building, 
  ChevronDown, 
  Check, 
  ExternalLink,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { NAV_ITEMS, getRoleBadge } from '@/components/Sidebar';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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

  // Handle ESC key and scroll lock when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

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
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Brand Logo & Org Info */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl rescue-gradient flex items-center justify-center p-1 rescue-glow group-hover:scale-105 transition-transform border border-cyan-400/40 flex-shrink-0">
              <img
                src="/icon.png"
                alt="Lead Rescue AI"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
              />
            </div>
            <div className="flex-shrink-0">
              <div className="font-black text-sm sm:text-base lg:text-lg tracking-tight leading-none flex items-center gap-1 whitespace-nowrap">
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  Lead
                </span>
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Rescue <span className="text-cyan-300 font-extrabold">AI</span>
                </span>
              </div>
              <div className="hidden sm:flex text-[9px] uppercase tracking-widest font-extrabold text-slate-400 items-center gap-1 mt-0.5 whitespace-nowrap">
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
              <Building className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-medium truncate max-w-[140px] lg:max-w-[180px]">{org.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 group-hover:border-purple-500/50 flex-shrink-0">
                {org.plan_name}
              </span>
            </Link>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Notification Bell Dropdown */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors touch-target flex items-center justify-center flex-shrink-0"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full rescue-gradient text-slate-950 font-black text-[10px] sm:text-[11px] flex items-center justify-center rescue-glow animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
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
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:pl-2.5 sm:pr-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 transition-colors touch-target flex-shrink-0"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-black flex items-center justify-center text-xs border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:block text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block flex-shrink-0" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors touch-target"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Settings & Team
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors touch-target"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Dashboard Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(!isMobileDrawerOpen);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            aria-expanded={isMobileDrawerOpen}
            aria-label={isMobileDrawerOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors touch-target flex items-center justify-center flex-shrink-0"
          >
            {isMobileDrawerOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Out Dashboard Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-between" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
            onClick={() => setIsMobileDrawerOpen(false)} 
          />

          {/* Drawer Panel */}
          <div className="relative bg-slate-900 border-b border-slate-800 shadow-2xl p-5 z-10 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-500/40">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[180px]">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">{org?.name || 'Organization'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white touch-target flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="py-3 space-y-1">
              {NAV_ITEMS.filter((item) => item.roles.includes(user?.role || 'Organization Owner')).map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all touch-target ${
                      isActive
                        ? item.highlight
                          ? 'rescue-gradient text-white font-bold rescue-glow'
                          : 'bg-gradient-to-r from-cyan-950/50 via-purple-950/30 to-slate-900 text-cyan-300 border border-cyan-500/40'
                        : item.highlight
                        ? 'text-purple-400 hover:bg-purple-500/10 border border-purple-500/30'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? (item.highlight ? 'text-white' : 'text-cyan-400') : item.highlight ? 'text-purple-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer / Sign Out */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors touch-target"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
