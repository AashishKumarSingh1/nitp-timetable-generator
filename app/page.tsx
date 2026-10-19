import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowRight, ShieldCheck, Users, DoorOpen, Armchair, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-zinc-950 to-red-950 text-zinc-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Subtle Crimson Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-red-900/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-950/20 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full pt-4 relative z-10">
        {/* Navigation Header */}
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="NIT Patna Official Logo"
                width={44}
                height={44}
                className="w-11 h-11 object-contain drop-shadow-md"
                priority
              />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight uppercase text-white">NIT Patna</h1>
              <p className="text-xs text-red-400 font-semibold tracking-wide">Academic Scheduling & Seating Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 text-xs">
                Staff Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" className="text-xs">
                Register Account
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-800/50 text-red-300 text-xs font-semibold mb-6 shadow-xs backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            Institutional Academic Scheduling Architecture · Session 2026-27
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
            Deterministic Timetables &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-200">
              Anti-Cheating Seating
            </span>
          </h2>

          <p className="text-base sm:text-lg text-zinc-300 mt-6 leading-relaxed max-w-2xl mx-auto font-normal">
            A dedicated single-college management system engineered for NIT Patna. Enforces zero room double-bookings, eliminates faculty overlap, and executes checkerboard alternating exam seating.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold px-8 py-3.5 shadow-xl shadow-red-900/30 border border-red-600/50">
                Access Scheduling Console
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Executive Feature Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 shadow-sm backdrop-blur-sm hover:border-red-800/60 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Clash-Free Timetable Solver</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deterministic constraint solver guaranteeing zero room clashes, continuous multi-hour lab spans, and faculty daily/weekly teaching caps.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 shadow-sm backdrop-blur-sm hover:border-red-800/60 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition-transform">
              <Armchair className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Anti-Cheating Seating Engine</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Checkerboard zigzag interleaving placing peers from different academic branches adjacently. Generates printable A4 door charts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 shadow-sm backdrop-blur-sm hover:border-red-800/60 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Dry-Run CSV Faculty Importer</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload faculty rosters with client-side syntax verification and database validation before committing atomic transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 py-6 border-t border-zinc-800/80 max-w-6xl mx-auto w-full relative z-10">
        National Institute of Technology Patna · Office of Academic Affairs & Examination Directorate
      </footer>
    </div>
  );
}
