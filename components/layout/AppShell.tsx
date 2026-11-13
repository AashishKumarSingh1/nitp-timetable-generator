'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Building2,
  DoorOpen,
  Users,
  Armchair,
  LogOut,
  Menu,
  X,
  Layers,
  GraduationCap,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from 'lucide-react';
import { WdcModal } from '@/components/wdc/WdcModal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Layers },
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Rooms & Halls', href: '/rooms', icon: DoorOpen },
  { name: 'Faculty Directory', href: '/faculty', icon: Users },
  { name: 'Student Directory', href: '/students', icon: GraduationCap, disabled: true, comingSoon: true },
  { name: 'Sections & Mapping', href: '/sections', icon: UserCheck },
  { name: 'Class Timetable', href: '/schedule', icon: Calendar },
  { name: 'Exam Seating Plan', href: '/seating', icon: Armchair, disabled: true, comingSoon: true },
];

const ROUTE_INFO: Record<string, { title: string; category: string }> = {
  '/dashboard': { title: 'Dashboard', category: 'Overview' },
  '/departments': { title: 'Departments', category: 'Academics' },
  '/rooms': { title: 'Rooms & Halls', category: 'Campus Facilities' },
  '/faculty': { title: 'Faculty Directory', category: 'Faculty' },
  '/students': { title: 'Student Directory', category: 'Students' },
  '/sections': { title: 'Sections & Allocations', category: 'Academic Planning' },
  '/schedule': { title: 'Class Timetable', category: 'Timetable' },
  '/seating': { title: 'Exam Seating Plan', category: 'Examinations' },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isWdcModalOpen, setIsWdcModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  // Prevent duplicate user fetches across re-renders
  const userFetchedRef = useRef(false);

  // Restore sidebar collapsed state after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('nitp_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const currentRouteInfo = ROUTE_INFO[pathname] || {
    title: NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.name || 'NIT Patna Portal',
    category: 'Portal',
  };


  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nitp_sidebar_collapsed', String(next));
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn('[AppShell] localStorage write failed:', e);
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        if (window.innerWidth < 768) {
          setSidebarOpen((prev) => !prev);
        } else {
          toggleCollapsed();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch user once — guard with ref to avoid repeat calls on route changes
  useEffect(() => {
    if (userFetchedRef.current) return;
    userFetchedRef.current = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  // If on login page, render children without the shell
  if (pathname === '/login') {
    return <>{children}</>;
  }


  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row text-zinc-900 antialiased selection:bg-red-900 selection:text-white">
      {/* Top Prestigious Crimson Accent Line (Main Content Area Only) */}
      <div
        className={`no-print fixed top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-800 via-rose-600 to-red-800 z-40 pointer-events-none ${
          mounted ? 'transition-[left] duration-300' : ''
        } ease-in-out ${
          isCollapsed ? 'md:left-20' : 'md:left-68'
        }`}
      />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="no-print fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sticky Left Sidebar Navigation */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 bg-zinc-900 border-r border-zinc-800/90 flex flex-col ${
          mounted ? 'transition-[width,transform] duration-300' : ''
        } ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 shadow-xl md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-68 md:w-20' : 'w-68'}`}
      >
        {/* Brand Header */}
        <div
          className={`p-3.5 border-b border-zinc-800/80 flex items-center shrink-0 ${
            isCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between'
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group min-w-0"
            title={isCollapsed ? 'NIT Patna Academic Engine' : undefined}
          >
            <div className="w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.png"
                alt="NIT Patna Official Logo"
                width={36}
                height={36}
                className="w-9 h-9 object-contain drop-shadow-sm"
                priority
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm tracking-tight text-white leading-tight uppercase truncate">
                  NIT Patna
                </h2>
                <p className="text-[11px] text-red-400 font-semibold tracking-wide truncate">
                  Academic Engine
                </p>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Toggle Button inside Sidebar Header */}
          <button
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            className="hidden md:flex text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {!isCollapsed ? (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              System Modules
            </div>
          ) : (
            <div className="hidden md:flex justify-center pb-2">
              <div className="w-4 h-0.5 bg-zinc-800 rounded-full" />
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const isActive = !item.disabled && (pathname === item.href || pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            // Disabled / Coming Soon items — render as a non-clickable div
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  title={item.comingSoon ? `${item.name} — Coming Soon` : item.name}
                  className={`group relative flex items-center rounded-xl text-xs font-semibold tracking-tight cursor-not-allowed opacity-40 ${
                    isCollapsed
                      ? 'px-0 py-2.5 justify-center'
                      : 'px-3.5 py-2.5 justify-between'
                  } text-zinc-500`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className="w-5 h-5 shrink-0 text-zinc-500" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && item.comingSoon && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                      Soon
                    </span>
                  )}
                  {/* Collapsed tooltip */}
                  {isCollapsed && (
                    <div className="hidden md:flex absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <span>{item.name}</span>
                      {item.comingSoon && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">
                          Soon
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={item.name}
                className={`group relative flex items-center rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 ${
                  isCollapsed
                    ? 'px-0 py-2.5 justify-center'
                    : 'px-3.5 py-2.5 justify-between'
                } ${
                  isActive
                    ? 'bg-red-700 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-105 shrink-0 ${
                      isActive ? 'text-white' : 'text-zinc-400 group-hover:text-red-400'
                    }`}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-red-800 text-red-100'
                        : 'bg-zinc-800 text-red-400 group-hover:bg-zinc-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="hidden md:flex absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold rounded-lg shadow-2xl whitespace-nowrap items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-red-400 border border-zinc-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Institution Badge & User Profile */}
        <div className="p-3 pb-6 border-t border-zinc-800 bg-zinc-950/50 space-y-3 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-800/60 flex items-center justify-center text-red-300 font-extrabold text-[10px] shrink-0">
                  NIT
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">
                    National Inst. of Technology
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">Session 2026-27 (Odd Sem)</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                    {user?.name ? user.name[0] : 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {user?.name || 'Administrator'}
                    </p>
                    <span className="text-[10px] text-red-400 font-semibold">
                      {user?.role || 'ADMIN'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div
                className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs cursor-default"
                title={`${user?.name || 'Administrator'} (${user?.role || 'ADMIN'})`}
              >
                {user?.name ? user.name[0] : 'A'}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dedicated Institutional Topbar (Sticky) */}
        <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-2.5 transition-colors shadow-2xs">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            {/* Left: Mobile sidebar toggle trigger & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle mobile navigation menu"
                className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-700 shrink-0 hidden sm:block" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 leading-none">
                    <span>NIT Patna</span>
                    <span>/</span>
                    <span className="text-red-700 font-semibold">{currentRouteInfo.category}</span>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-snug mt-0.5">
                    {currentRouteInfo.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right: Operational Status Badges & Quick User Indicator */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Academic Session Pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Session 2026-27</span>
              </div>

              {/* Semester Indicator */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-xs font-semibold text-red-900">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                <span>Odd Semester</span>
              </div>

              {/* User Avatar Capsule */}
              <div className="flex items-center gap-2 pl-1 sm:pl-3 border-l border-zinc-200">
                <div className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 uppercase">
                  {user?.name ? user.name[0].toUpperCase() : 'S'}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-zinc-800 leading-none truncate max-w-[130px]">
                    {user?.name || 'System Administrator'}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">nitp.ac.in</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Institutional Footer */}
        <footer className="no-print mt-auto border-t border-zinc-200/80 bg-white px-4 sm:px-6 lg:px-8 py-5 text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Institute details */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-700" />
                <span className="font-bold text-zinc-800 tracking-tight">
                  National Institute of Technology Patna. All Rights Reserved.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsWdcModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-medium text-zinc-500 hover:text-red-700 transition-colors group cursor-pointer focus:outline-none"
              >
                <span>Developed by</span>
                <span className="font-bold text-zinc-800 group-hover:text-red-700 underline decoration-zinc-300 group-hover:decoration-red-700 underline-offset-2">
                  WDC NIT Patna
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Bottom Prestigious Crimson Accent Line (Main Content Area Only) */}
      <div
        className={`no-print fixed bottom-0 right-0 left-0 h-1 bg-gradient-to-r from-red-800 via-rose-600 to-red-800 z-30 pointer-events-none ${
          mounted ? 'transition-[left] duration-300' : ''
        } ease-in-out ${
          isCollapsed ? 'md:left-20' : 'md:left-68'
        }`}
      />

      {/* WDC Team Modal */}
      <WdcModal isOpen={isWdcModalOpen} onClose={() => setIsWdcModalOpen(false)} />
    </div>
  );
}
