import Link from 'next/link';
import {
  Building2,
  DoorOpen,
  Users,
  Calendar,
  Armchair,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { queryOne, query } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Aggregate stats via pure SQL
  const stats = await queryOne<{
    dept_count: number;
    room_count: number;
    total_capacity: number;
    faculty_count: number;
    session_count: number;
    exam_count: number;
    seating_count: number;
  }>(`
    SELECT 
      (SELECT COUNT(*) FROM departments) AS dept_count,
      (SELECT COUNT(*) FROM rooms) AS room_count,
      (SELECT COALESCE(SUM(capacity), 0) FROM rooms) AS total_capacity,
      (SELECT COUNT(*) FROM faculty) AS faculty_count,
      (SELECT COUNT(*) FROM class_sessions) AS session_count,
      (SELECT COUNT(*) FROM exam_schedules) AS exam_count,
      (SELECT COUNT(*) FROM seat_allocations) AS seating_count
  `);

  // Physical collision audits
  const roomCollisions = await query<{ count: number }>(`
    SELECT COUNT(*) as count FROM (
      SELECT room_id, day, period_index, COUNT(*) as c
      FROM class_sessions
      GROUP BY room_id, day, period_index
      HAVING COUNT(*) > 1
    )
  `);

  const facultyCollisions = await query<{ count: number }>(`
    SELECT COUNT(*) as count FROM (
      SELECT faculty_id, day, period_index, COUNT(*) as c
      FROM class_sessions
      GROUP BY faculty_id, day, period_index
      HAVING COUNT(*) > 1
    )
  `);

  const hasRoomClash = (roomCollisions[0]?.count || 0) > 0;
  const hasFacultyClash = (facultyCollisions[0]?.count || 0) > 0;

  // Recent departments
  const departments = await query<{
    id: string;
    name: string;
    code: string;
    faculty_count: number;
    room_count: number;
  }>(`
    SELECT d.id, d.name, d.code,
           COUNT(DISTINCT f.id) AS faculty_count,
           COUNT(DISTINCT r.id) AS room_count
    FROM departments d
    LEFT JOIN faculty f ON f.department_id = d.id
    LEFT JOIN rooms r ON r.department_id = d.id
    GROUP BY d.id, d.name, d.code
    ORDER BY d.name ASC
  `);

  return (
    <div className="space-y-8">
      {/* Header Banner - Executive Crimson Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-zinc-950 to-stone-900 p-7 sm:p-9 text-white shadow-lg border border-red-900/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-800/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-900/40 border border-red-700/50 text-red-300 text-xs font-semibold backdrop-blur-md">
            <GraduationCap className="w-3.5 h-3.5 text-red-400" />
            NIT Patna Academic Directorate
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Academic Operations Dashboard
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed font-normal">
            Centralized academic management system. Oversee departments, inspect room capacities, execute deterministic clash-free timetables, and coordinate anti-cheating exam seating.
          </p>
        </div>
      </div>

      {/* Invariant Health Check Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className={`p-2.5 rounded-xl ${hasRoomClash ? 'bg-rose-100 text-rose-700' : 'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'}`}>
            {hasRoomClash ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-red-700 dark:text-red-400" />}
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Room Conflicts
            </h4>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {hasRoomClash ? `${roomCollisions[0].count} Double-Bookings Detected` : '0 Double-Bookings (100% Free)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className={`p-2.5 rounded-xl ${hasFacultyClash ? 'bg-rose-100 text-rose-700' : 'bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'}`}>
            {hasFacultyClash ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-red-700 dark:text-red-400" />}
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Faculty Overlap
            </h4>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {hasFacultyClash ? `${facultyCollisions[0].count} Conflicts Found` : '0 Overlaps (100% Deterministic)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
            <Armchair className="w-5 h-5 text-red-700 dark:text-red-400" />
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Anti-Cheating Engine
            </h4>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Zigzag Interleaving Active
            </p>
          </div>
        </div>
      </div>

      {/* KPI Numerical Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-red-200 dark:hover:border-red-900/60 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Departments
              </span>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
              {stats?.dept_count || 0}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active engineering branches
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-200 dark:hover:border-red-900/60 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Halls & Labs
              </span>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
              {stats?.room_count || 0}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {stats?.total_capacity || 0} total desk capacity
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-200 dark:hover:border-red-900/60 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Faculty Members
              </span>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
              {stats?.faculty_count || 0}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Teaching instructors
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-200 dark:hover:border-red-900/60 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active Sessions
              </span>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
              {stats?.session_count || 0}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Scheduled weekly periods
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-red-50/40 via-white to-white dark:from-red-950/20 dark:to-zinc-900 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="crimson">Timetable Engine</Badge>
              <Calendar className="w-5 h-5 text-red-700" />
            </div>
            <CardTitle className="text-lg mt-2 font-bold">Automated Timetable Generator</CardTitle>
            <CardDescription className="text-zinc-500">
              Execute the constraint solver algorithm to place all course lectures and multi-hour lab blocks without room, teacher, or cohort double-bookings.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/schedule">
              <Button variant="primary" className="w-full sm:w-auto text-xs">
                Open Timetable Matrix
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:to-zinc-900 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="crimson">Exam Security</Badge>
              <Armchair className="w-5 h-5 text-red-700" />
            </div>
            <CardTitle className="text-lg mt-2 font-bold">Anti-Cheating Seating Engine</CardTitle>
            <CardDescription className="text-zinc-500">
              Assign students to physical classroom rows and desks using the checkerboard interleaving pattern. Generates printable door notices for examination halls.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/seating">
              <Button variant="primary" className="w-full sm:w-auto text-xs">
                Launch Seating Planner
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Academic Departments Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold">Academic Departments</CardTitle>
            <CardDescription className="text-xs">Live breakdown of departments, faculty rosters, and allocated lecture halls</CardDescription>
          </div>
          <Link href="/departments">
            <Button variant="outline" size="sm" className="text-xs">
              Manage Departments
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Code</th>
                  <th className="pb-3 px-3">Department Name</th>
                  <th className="pb-3 px-3 text-center">Faculty</th>
                  <th className="pb-3 px-3 text-center">Rooms</th>
                  <th className="pb-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-red-700 dark:text-red-400">
                      {dept.code}
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {dept.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {dept.faculty_count} Members
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {dept.room_count} Halls
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant="emerald" size="sm">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
