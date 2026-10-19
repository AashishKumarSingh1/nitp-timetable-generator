'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Trash2,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Section, Course, Faculty, Department, Allocation, SEMESTERS } from '../types';

interface AllocationsTabProps {
  allocations: Allocation[];
  sections: Section[];
  courses: Course[];
  faculty: Faculty[];
  departments: Department[];
  loading: boolean;
  preselectedSectionId?: string;
  onRefresh: () => void;
}

export function AllocationsTab({
  allocations,
  sections,
  courses,
  faculty,
  departments,
  loading,
  preselectedSectionId,
  onRefresh,
}: AllocationsTabProps) {
  const { toast } = useToast();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState<number | ''>('');

  // Studio Collapsible state
  const [isStudioOpen, setIsStudioOpen] = useState(true);

  // Quick Mapping State
  const [quickDeptId, setQuickDeptId] = useState(departments[0]?.id || '');
  const [quickSectionId, setQuickSectionId] = useState(preselectedSectionId || '');
  const [quickCourseId, setQuickCourseId] = useState('');
  const [quickFacultyId, setQuickFacultyId] = useState('');
  const [quickPeriods, setQuickPeriods] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // If preselectedSectionId changes from outside
  useEffect(() => {
    if (preselectedSectionId) {
      const match = sections.find((s) => s.id === preselectedSectionId);
      if (match) {
        setQuickDeptId(match.department_id);
        setQuickSectionId(match.id);
        setIsStudioOpen(true);
      }
    }
  }, [preselectedSectionId, sections]);

  // Initial department select
  useEffect(() => {
    if (departments.length > 0 && !quickDeptId) {
      setQuickDeptId(departments[0].id);
    }
  }, [departments, quickDeptId]);

  // Cascading options for the Quick Mapping Studio
  const filteredSectionsForQuick = useMemo(() => {
    if (!quickDeptId) return sections;
    return sections.filter((s) => s.department_id === quickDeptId);
  }, [sections, quickDeptId]);

  const selectedSectionObj = useMemo(() => {
    return sections.find((s) => s.id === quickSectionId);
  }, [sections, quickSectionId]);

  const filteredCoursesForQuick = useMemo(() => {
    if (!quickDeptId) return courses;
    let list = courses.filter((c) => c.department_id === quickDeptId);
    if (selectedSectionObj) {
      const matchSem = list.filter((c) => c.semester === selectedSectionObj.semester);
      if (matchSem.length > 0) return matchSem;
    }
    return list;
  }, [courses, quickDeptId, selectedSectionObj]);

  const filteredFacultyForQuick = useMemo(() => {
    if (!quickDeptId) return faculty;
    return faculty.filter((f) => f.department_id === quickDeptId);
  }, [faculty, quickDeptId]);

  // Keep quick mapping selectors aligned
  useEffect(() => {
    if (filteredSectionsForQuick.length > 0) {
      if (!quickSectionId || !filteredSectionsForQuick.some((s) => s.id === quickSectionId)) {
        setQuickSectionId(filteredSectionsForQuick[0].id);
      }
    } else {
      setQuickSectionId('');
    }

    if (filteredCoursesForQuick.length > 0) {
      if (!quickCourseId || !filteredCoursesForQuick.some((c) => c.id === quickCourseId)) {
        setQuickCourseId(filteredCoursesForQuick[0].id);
      }
    } else {
      setQuickCourseId('');
    }

    if (filteredFacultyForQuick.length > 0) {
      if (!quickFacultyId || !filteredFacultyForQuick.some((f) => f.id === quickFacultyId)) {
        setQuickFacultyId(filteredFacultyForQuick[0].id);
      }
    } else {
      setQuickFacultyId('');
    }
  }, [quickDeptId, filteredSectionsForQuick, filteredCoursesForQuick, filteredFacultyForQuick]);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSectionId || !quickCourseId || !quickFacultyId) {
      toast.error('Please select Section, Course, and Faculty');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sections/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: quickSectionId,
          course_id: quickCourseId,
          faculty_id: quickFacultyId,
          periods_per_week: quickPeriods,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to map faculty');

      toast.success(
        data.updated ? 'Teaching assignment updated!' : 'Faculty successfully mapped to course & section!'
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alloc: Allocation) => {
    if (!confirm(`Remove ${alloc.faculty_name} from teaching ${alloc.course_code} (${alloc.section_name})?`)) return;
    try {
      const res = await fetch(`/api/sections/allocations?id=${alloc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete mapping');
      toast.success('Teaching assignment removed');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const query = search.trim().toLowerCase();

  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (deptFilter && a.department_id !== deptFilter) return false;
      if (semFilter && a.semester !== Number(semFilter)) return false;
      if (!query) return true;
      return (
        a.section_name.toLowerCase().includes(query) ||
        a.course_code.toLowerCase().includes(query) ||
        a.course_name.toLowerCase().includes(query) ||
        a.faculty_name.toLowerCase().includes(query) ||
        a.faculty_code.toLowerCase().includes(query) ||
        a.department_name.toLowerCase().includes(query) ||
        a.department_code.toLowerCase().includes(query)
      );
    });
  }, [allocations, deptFilter, semFilter, query]);

  return (
    <div className="space-y-5">
      {/* Interactive Quick Mapping Studio */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white via-zinc-50/50 to-red-50/20 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 shadow-xs">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-700" />
              <div>
                <CardTitle className="text-sm font-bold">
                  Interactive Teaching Assignment Studio
                </CardTitle>
                <CardDescription className="text-xs">
                  Pair semester courses with designated faculty for specific student cohorts
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="crimson" size="sm">
                Fast Mapping
              </Badge>
              <button
                type="button"
                onClick={() => setIsStudioOpen(!isStudioOpen)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                title={isStudioOpen ? 'Collapse Studio' : 'Expand Studio'}
              >
                {isStudioOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardHeader>

        {isStudioOpen && (
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleCreateMapping} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Choose Department */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    1. Department
                  </label>
                  <Select
                    value={quickDeptId}
                    onChange={(e) => setQuickDeptId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* 2. Choose Student Section */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    2. Section Cohort
                  </label>
                  <Select
                    value={quickSectionId}
                    onChange={(e) => setQuickSectionId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    {filteredSectionsForQuick.length === 0 ? (
                      <option value="">No sections in this department</option>
                    ) : (
                      filteredSectionsForQuick.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Sem {s.semester} · {s.strength} students)
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                {/* 3. Choose Course */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    3. Course Subject
                  </label>
                  <Select
                    value={quickCourseId}
                    onChange={(e) => setQuickCourseId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    {filteredCoursesForQuick.length === 0 ? (
                      <option value="">No courses matching semester</option>
                    ) : (
                      filteredCoursesForQuick.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name} ({c.span > 1 ? `${c.span}h Lab` : '1h Lec'})
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                {/* 4. Choose Faculty */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    4. Assigned Faculty
                  </label>
                  <Select
                    value={quickFacultyId}
                    onChange={(e) => setQuickFacultyId(e.target.value)}
                    className="w-full text-xs"
                    required
                  >
                    {filteredFacultyForQuick.length === 0 ? (
                      <option value="">No faculty in this department</option>
                    ) : (
                      filteredFacultyForQuick.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.code})
                        </option>
                      ))
                    )}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Weekly Load:</span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickPeriods(p)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-colors ${
                          quickPeriods === p
                            ? 'bg-red-700 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {p} hrs
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  className="w-full sm:w-auto text-xs"
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  Assign Faculty to Section
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <Input
            placeholder="Search by instructor, course code, section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs py-1.5 w-full sm:w-44"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </Select>

          <Select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value ? Number(e.target.value) : '')}
            className="text-xs py-1.5 w-full sm:w-32"
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Showing <strong>{filteredAllocations.length}</strong> of {allocations.length} teaching assignments
        </span>
        {(deptFilter || semFilter || search) && (
          <button
            onClick={() => {
              setSearch('');
              setDeptFilter('');
              setSemFilter('');
            }}
            className="text-red-700 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Allocations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Student Section & Cohort</th>
                  <th className="py-3 px-4">Course Subject</th>
                  <th className="py-3 px-4">Assigned Instructor</th>
                  <th className="py-3 px-4 text-center">Weekly Load</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-zinc-400">
                      Loading teaching allocations...
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-red-700" />
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">No teaching allocations found</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {search || deptFilter || semFilter
                          ? 'Try clearing your search query or filters'
                          : 'Use the Assignment Studio above to pair an instructor with a section course.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => (
                    <tr
                      key={alloc.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs">
                          {alloc.department_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{alloc.section_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-zinc-500 font-medium">Semester {alloc.semester}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 dark:text-red-300">
                            <Users className="w-3 h-3 text-red-700" />
                            {alloc.section_strength} Students
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-red-700 dark:text-red-400">{alloc.course_code}</span>
                          {alloc.course_span > 1 ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 text-[10px] font-bold border border-stone-200 dark:border-stone-700">
                              {alloc.course_span}h Lab
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700">
                              Theory
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-300 truncate max-w-xs mt-0.5" title={alloc.course_name}>
                          {alloc.course_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{alloc.faculty_name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {alloc.faculty_code} · {alloc.faculty_designation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-900/40 font-mono text-xs">
                          {alloc.periods_per_week} hrs/wk
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(alloc)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
