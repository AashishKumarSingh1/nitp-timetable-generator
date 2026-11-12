import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  Calendar,
  Armchair,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { queryOne, query } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
    course_count: number;
    student_count: number;
    session_count: number;
    exam_count: number;
    seating_count: number;
  }>(`
    SELECT 
      (SELECT COUNT(*) FROM departments) AS dept_count,
      (SELECT COUNT(*) FROM rooms) AS room_count,
      (SELECT COALESCE(SUM(capacity), 0) FROM rooms) AS total_capacity,
      (SELECT COUNT(*) FROM faculty) AS faculty_count,
      (SELECT COUNT(*) FROM courses) AS course_count,
      (SELECT COUNT(*) FROM students) AS student_count,
      (SELECT COUNT(*) FROM class_sessions) AS session_count,
      (SELECT COUNT(*) FROM exam_schedules) AS exam_count,
      (SELECT COUNT(*) FROM seat_allocations) AS seating_count
  `);

  // Department breakdown
  const departments = await query<{
    id: string;
    name: string;
    code: string;
    faculty_count: number;
    room_count: number;
    course_count: number;
  }>(`
    SELECT d.id, d.name, d.code,
           COUNT(DISTINCT f.id) AS faculty_count,
           COUNT(DISTINCT r.id) AS room_count,
           COUNT(DISTINCT c.id) AS course_count
    FROM departments d
    LEFT JOIN faculty f ON f.department_id = d.id
    LEFT JOIN rooms r ON r.department_id = d.id
    LEFT JOIN courses c ON c.department_id = d.id
    GROUP BY d.id, d.name, d.code
    ORDER BY d.code ASC
  `);

  return (
    <div className="space-y-6">
      {/* KPI Numerical Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/departments" className="group">
          <Card className="hover:border-red-300 hover:shadow-sm transition-all h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Departments
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-900 mt-2">
                {stats?.dept_count || 0}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>Active branches</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-700" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rooms" className="group">
          <Card className="hover:border-red-300 hover:shadow-sm transition-all h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Halls & Labs
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
                  <DoorOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-900 mt-2">
                {stats?.room_count || 0}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>{stats?.total_capacity || 0} desk capacity</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-700" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/faculty" className="group">
          <Card className="hover:border-red-300 hover:shadow-sm transition-all h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Faculty Members
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-900 mt-2">
                {stats?.faculty_count || 0}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>Teaching instructors</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-700" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/schedule" className="group">
          <Card className="hover:border-red-300 hover:shadow-sm transition-all h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Active Sessions
                </span>
                <div className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:bg-red-700 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-900 mt-2">
                {stats?.session_count || 0}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>Scheduled weekly periods</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-700" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Departments Breakdown & Operations Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Academic Departments Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-700" />
                  Academic Departments
                </CardTitle>
              </div>
              <Link href="/departments">
                <Button variant="outline" size="sm" className="text-xs">
                  Manage Departments
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-3">Department Name</th>
                      <th className="py-2.5 px-3 text-center">Faculty</th>
                      <th className="py-2.5 px-3 text-center">Rooms</th>
                      <th className="py-2.5 px-3 text-center">Courses</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/80">
                            {dept.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-zinc-900">
                          {dept.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
                            {dept.faculty_count}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
                            {dept.room_count}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
                            {dept.course_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
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

        {/* Right Column: Operations Hub & Quick Links (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Timetable Engine Card */}
          <Card className="hover:border-zinc-300 transition-all border-zinc-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-50 text-red-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">Timetable Engine</h3>
                    <p className="text-[11px] text-zinc-500">Clash-free lecture scheduling</p>
                  </div>
                </div>
                <Badge variant={stats?.session_count ? 'emerald' : 'slate'} size="sm">
                  {stats?.session_count ? `${stats.session_count} Sessions` : '0 Sessions'}
                </Badge>
              </div>

              <div className="pt-3.5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {stats?.session_count ? 'All class sessions scheduled' : 'Schedule matrix ready for generation'}
                </span>
                <Link href="/schedule">
                  <Button size="sm" variant="primary" className="text-xs whitespace-nowrap">
                    Open Grid
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Anti-Cheating Seating Card */}
          <Card className="hover:border-zinc-300 transition-all border-zinc-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-50 text-red-700">
                    <Armchair className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">Anti-Cheating Seating</h3>
                    <p className="text-[11px] text-zinc-500">Zigzag checkerboard seating</p>
                  </div>
                </div>
                <Badge variant={stats?.seating_count ? 'emerald' : 'slate'} size="sm">
                  {stats?.seating_count ? `${stats.seating_count} Seats` : 'Ready'}
                </Badge>
              </div>

              <div className="pt-3.5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {stats?.seating_count ? 'Printable door charts available' : 'Generate exam seat arrangements'}
                </span>
                <Link href="/seating">
                  <Button size="sm" variant="secondary" className="text-xs whitespace-nowrap border border-zinc-200">
                    Open Planner
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Management Shortcuts */}
          <Card className="border-zinc-200">
            <CardHeader className="py-3 px-5 border-b border-zinc-100">
              <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Quick Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 divide-y divide-zinc-50">
              <Link
                href="/faculty"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-red-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Faculty Directory & CSV Importer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>

              <Link
                href="/rooms"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-red-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <DoorOpen className="w-4 h-4 text-zinc-400" />
                  <span>Classrooms, Labs & Availability Matrix</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>

              <Link
                href="/sections"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-red-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  <span>Sections, Courses & Teaching Allocations</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>

              <Link
                href="/students"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-xs font-semibold text-zinc-700 hover:text-red-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-zinc-400" />
                  <span>Student Rosters & Batch Enrollment</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
