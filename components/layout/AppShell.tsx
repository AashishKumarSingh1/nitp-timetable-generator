'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  Compass,
  UserCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Layers },
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Rooms & Halls', href: '/rooms', icon: DoorOpen },
  { name: 'Faculty Directory', href: '/faculty', icon: Users },
  { name: 'Sections & Mapping', href: '/sections', icon: UserCheck, badge: 'Strength' },
  { name: 'Class Timetable', href: '/schedule', icon: Calendar, badge: 'Clash-Free' },
  { name: 'Exam Seating Plan', href: '/seating', icon: Armchair, badge: 'Anti-Cheat' },
];

const ROUTE_INFO: Record<string, { title: string; subtitle: string; category: string }> = {
  '/dashboard': {
    title: 'Executive Dashboard',
    subtitle: 'Institutional telemetry, quick stats & recent schedules',
    category: 'Overview',
  },
  '/departments': {
    title: 'Department Management',
    subtitle: 'Configure engineering branches and academic divisions',
    category: 'Master Data',
  },
  '/rooms': {
    title: 'Rooms & Examination Halls',
    subtitle: 'Room capacities, seating matrix layout & availability',
    category: 'Infrastructure',
  },
  '/faculty': {
    title: 'Faculty Directory & CSV Ingestion',
    subtitle: 'Faculty appointments, teaching load & bulk import',
    category: 'Academic Staff',
  },
  '/sections': {
    title: 'Student Sections & Faculty Mapping',
    subtitle: 'Student cohort strengths, course allocations & instructor assignments',
    category: 'Curriculum & Allocations',
  },
  '/schedule': {
    title: 'Class Timetable Generator',
    subtitle: 'Automated clash-free schedule matrix with 0 collisions',
    category: 'Scheduling Engine',
  },
  '/seating': {
    title: 'Anti-Cheating Seating Planner',
    subtitle: 'Multi-department staggered seating with 0 adjacent peers',
    category: 'Examination Engine',
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
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

  // If on login or signup pages, render children without the shell
  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  const currentRouteInfo = ROUTE_INFO[pathname] || {
    title: 'NIT Patna Academic Portal',
    subtitle: 'Scheduling and Examination Operations',
    category: 'Operations',
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row text-zinc-900 antialiased selection:bg-red-900 selection:text-white">
      {/* Top Prestigious Crimson Accent Line */}
      <div className="no-print fixed top-0 inset-x-0 h-1 bg-gradient-to-r from-red-800 via-rose-600 to-red-800 z-50 pointer-events-none" />

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
        className={`no-print fixed inset-y-0 left-0 z-50 w-68 bg-zinc-900 border-r border-zinc-800/90 flex flex-col transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 shadow-xl md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700 via-red-800 to-rose-950 flex items-center justify-center text-white shadow-md border border-red-600/40 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-white leading-tight uppercase">
                NIT Patna
              </h2>
              <p className="text-[11px] text-red-400 font-semibold tracking-wide">Academic Engine</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            System Modules
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 ${
                  isActive
                    ? 'bg-red-700 text-white shadow-md shadow-red-950/40'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-zinc-400 group-hover:text-red-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-red-800 text-red-100'
                        : 'bg-zinc-800 text-red-400 group-hover:bg-zinc-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Institution Badge & User Profile */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 space-y-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-800/60 flex items-center justify-center text-red-300 font-extrabold text-[10px]">
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
              <div className="w-7 h-7 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Administrator'}</p>
                <span className="text-[10px] text-red-400 font-semibold">{user?.role || 'ADMIN'}</span>
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
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dedicated Institutional Topbar (Sticky) */}
        <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-3 transition-colors shadow-2xs">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            {/* Left: Mobile trigger & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="md:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-700 animate-pulse hidden sm:block" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                    <span>NIT Patna</span>
                    <span>/</span>
                    <span className="text-red-800 font-semibold">{currentRouteInfo.category}</span>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-tight">
                    {currentRouteInfo.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right: Operational Status Badges & Quick User Indicator */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Academic Session Pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Session 2026-27</span>
              </div>

              {/* Conflict Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-semibold text-red-900">
                <ShieldCheck className="w-3.5 h-3.5 text-red-700" />
                <span className="hidden md:inline">Clash-Free Engine</span>
                <span className="md:hidden">0 Clashes</span>
              </div>

              {/* User Avatar Capsule */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-zinc-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-800 to-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.name ? user.name[0] : 'A'}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-zinc-800 leading-none truncate max-w-[120px]">
                    {user?.name || 'Administrator'}
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
                  National Institute of Technology Patna
                </span>
              </div>
              <span className="hidden sm:inline text-zinc-300">•</span>
              <span className="text-zinc-500">
                Academic Timetable & Anti-Cheating Seating System
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-zinc-600 font-medium">Made with precision by</span>
              <a
                href=""
                target="_blank"
                rel="noopener noreferrer"
                title="Connect with Aashish on LinkedIn"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-red-50/70 text-zinc-900 hover:text-red-900 border border-zinc-200 hover:border-red-300 font-semibold text-xs transition-all duration-150 shadow-2xs group"
              >
                {/* LinkedIn SVG Icon */}
                <svg
                  className="w-4 h-4 text-[#0A66C2] group-hover:scale-110 transition-transform shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.25a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
                </svg>
                <span>Aashish</span>
                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-red-700 transition-colors" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
