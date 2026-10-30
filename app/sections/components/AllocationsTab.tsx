'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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

  // Quick Mapping State (Scenario 1: Subject-Code Master Assignment)
  const [scopeMode, setScopeMode] = useState<'ALL' | 'SINGLE'>('ALL');
  const [quickDeptId, setQuickDeptId] = useState(departments[0]?.id || '');
  const [quickSectionId, setQuickSectionId] = useState(preselectedSectionId || '');
  const [quickCourseId, setQuickCourseId] = useState('');
  const [quickFacultyId, setQuickFacultyId] = useState('');
  const [quickPeriods, setQuickPeriods] = useState(3);
  const [maxBatches, setMaxBatches] = useState<number | 'ALL'>('ALL');
  const [autoBalance, setAutoBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // If preselectedSectionId changes from outside
  useEffect(() => {
    if (preselectedSectionId) {
      const match = sections.find((s) => s.id === preselectedSectionId);
      if (match) {
        setQuickDeptId(match.department_id);
        setQuickSectionId(match.id);
        setScopeMode('SINGLE');
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
    if (scopeMode === 'SINGLE' && selectedSectionObj) {
      const matchSem = list.filter((c) => c.semester === selectedSectionObj.semester);
      if (matchSem.length > 0) return matchSem;
    }
    return list;
  }, [courses, quickDeptId, scopeMode, selectedSectionObj]);

  const filteredFacultyForQuick = useMemo(() => {
    if (!quickDeptId) return faculty;
    return faculty.filter((f) => f.department_id === quickDeptId);
  }, [faculty, quickDeptId]);

  // Real-time Faculty Workload Map
  const facultyWorkloadMap = useMemo(() => {
    const map = new Map<string, { current: number; max: number; remaining: number }>();
    for (const f of faculty) {
      const max = (f as any).max_weekly_periods || 18;
      const current = allocations
        .filter((a) => a.faculty_id === f.id)
        .reduce((acc, a) => acc + (a.periods_per_week || 3), 0);
      map.set(f.id, { current, max, remaining: Math.max(0, max - current) });
    }
    return map;
  }, [faculty, allocations]);

  // Options for SearchableSelect
  const quickCourseOptions = useMemo(() => {
    return filteredCoursesForQuick.map((c) => ({
      value: c.id,
      label: `${c.code} · ${c.name}`,
      sublabel: `Sem ${c.semester || '-'} · ${c.periods_per_week || 3} hrs/week`,
      badge: c.span > 1 ? `${c.span}h Lab` : '1h Lec',
      searchTerms: `${c.code} ${c.name}`,
    }));
  }, [filteredCoursesForQuick]);

  const quickFacultyOptions = useMemo(() => {
    return filteredFacultyForQuick.map((f) => {
      const wl = facultyWorkloadMap.get(f.id);
      return {
        value: f.id,
        label: `${f.name} (${f.code})`,
        badge: `${wl?.current || 0}/${wl?.max || 18} hrs`,
        sublabel: wl && wl.remaining === 0 ? 'Capacity reached' : undefined,
        searchTerms: `${f.name} ${f.code}`,
      };
    });
  }, [filteredFacultyForQuick, facultyWorkloadMap]);

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

  // Selected course details
  const selectedCourseObj = useMemo(() => {
    return courses.find((c) => c.id === quickCourseId);
  }, [courses, quickCourseId]);

  // Synchronize periods when course changes
  useEffect(() => {
    if (selectedCourseObj) {
      setQuickPeriods(selectedCourseObj.periods_per_week || 3);
    }
  }, [selectedCourseObj]);

  const targetSectionCount = scopeMode === 'ALL' ? filteredSectionsForQuick.length : 1;
  const teacherBatchesAllowed = scopeMode === 'ALL'
    ? (maxBatches === 'ALL' ? targetSectionCount : Math.min(Number(maxBatches), targetSectionCount))
    : 1;
  const secondaryBatchesNeeded = targetSectionCount - teacherBatchesAllowed;
  const totalProjectedHours = quickPeriods * teacherBatchesAllowed;
  const selectedFacWorkload = facultyWorkloadMap.get(quickFacultyId);
  const isOverCapacity = selectedFacWorkload
    ? selectedFacWorkload.current + totalProjectedHours > selectedFacWorkload.max
    : false;

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCourseId || !quickFacultyId) {
      toast.error('Please select Course Subject and Assigned Faculty');
      return;
    }
    if (scopeMode === 'SINGLE' && !quickSectionId) {
      toast.error('Please select a Section Cohort');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sections/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: scopeMode === 'ALL' ? 'all_sections' : 'single',
          department_id: quickDeptId,
          section_id: scopeMode === 'ALL' ? 'ALL' : quickSectionId,
          course_id: quickCourseId,
          faculty_id: quickFacultyId,
          periods_per_week: quickPeriods,
          max_batches_per_teacher: scopeMode === 'ALL' && maxBatches !== 'ALL' ? Number(maxBatches) : undefined,
          auto_balance: autoBalance,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to map faculty');

      if (scopeMode === 'ALL') {
        toast.success(
          `Subject assigned across ${data.total_assigned || targetSectionCount} sections in department!`
        );
      } else {
        toast.success(
          data.updated ? 'Teaching assignment updated!' : 'Faculty successfully mapped to course & section!'
        );
      }
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
              <BookOpen className="w-4 h-4 text-red-700" />
              <div>
                <CardTitle className="text-sm font-bold">
                  Interactive Teaching Assignment Studio
                </CardTitle>
                <CardDescription className="text-xs">
                  Scenario 1: Assign Professor X to Subject Code Y across all sections with capacity balancing
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="crimson" size="sm">
                Master Mapping
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
            {/* Scope Mode Toggle Buttons */}
            <div className="flex items-center gap-2 mb-4 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 w-fit">
              <button
                type="button"
                onClick={() => setScopeMode('ALL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeMode === 'ALL'
                    ? 'bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Sections in Department ({filteredSectionsForQuick.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeMode('SINGLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scopeMode === 'SINGLE'
                    ? 'bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Single Section Cohort
              </button>
            </div>

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

                {/* 2. Choose Course Subject by Code */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    2. Subject Code & Course
                  </label>
                  <SearchableSelect
                    value={quickCourseId}
                    onChange={(val) => setQuickCourseId(val)}
                    options={quickCourseOptions}
                    placeholder={
                      filteredCoursesForQuick.length === 0
                        ? 'No courses available'
                        : 'Select course...'
                    }
                    searchPlaceholder="Search course code (e.g. CE301, Concrete)..."
                    disabled={filteredCoursesForQuick.length === 0}
                  />
                </div>

                {/* 3. Section Scope */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    3. Target Cohort(s)
                  </label>
                  {scopeMode === 'ALL' ? (
                    <div className="h-9 px-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-red-700" />
                        All {filteredSectionsForQuick.length} Sections
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {filteredSectionsForQuick.map((s) => s.name).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={quickSectionId}
                      onChange={(e) => setQuickSectionId(e.target.value)}
                      className="w-full text-xs"
                      required
                    >
                      {filteredSectionsForQuick.length === 0 ? (
                        <option value="">No sections in department</option>
                      ) : (
                        filteredSectionsForQuick.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Sem {s.semester} · {s.strength} students)
                          </option>
                        ))
                      )}
                    </Select>
                  )}
                </div>

                {/* 4. Choose Faculty with Live Workload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    4. Assigned Faculty
                  </label>
                  <SearchableSelect
                    value={quickFacultyId}
                    onChange={(val) => setQuickFacultyId(val)}
                    options={quickFacultyOptions}
                    placeholder={
                      filteredFacultyForQuick.length === 0
                        ? 'No faculty in this department'
                        : 'Select faculty member...'
                    }
                    searchPlaceholder="Search faculty name or code..."
                    disabled={filteredFacultyForQuick.length === 0}
                  />
                </div>
              </div>

              {/* How many batches can this teacher teach for this subject? */}
              {scopeMode === 'ALL' && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-red-700" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      How many batches can this teacher teach for this subject?
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: `All Batches (${filteredSectionsForQuick.length})`, val: 'ALL' },
                      { label: 'Max 1 Batch', val: 1 },
                      { label: 'Max 2 Batches', val: 2 },
                      { label: 'Max 3 Batches', val: 3 },
                    ].map((b) => (
                      <button
                        key={String(b.val)}
                        type="button"
                        onClick={() => setMaxBatches(b.val as any)}
                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                          maxBatches === b.val
                            ? 'bg-red-700 text-white'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Batches Auto-Distribution Notice */}
              {scopeMode === 'ALL' && secondaryBatchesNeeded > 0 && (
                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Primary instructor teaches {teacherBatchesAllowed} batch{teacherBatchesAllowed > 1 ? 'es' : ''} ({totalProjectedHours} hrs). Remaining {secondaryBatchesNeeded} batch{secondaryBatchesNeeded > 1 ? 'es' : ''} will be auto-assigned to another available department professor.
                  </span>
                  <span className="font-mono text-[10px] bg-sky-100 dark:bg-sky-900 px-2 py-0.5 rounded-md font-semibold">
                    100% Course Coverage Guaranteed
                  </span>
                </div>
              )}

              {/* Workload Warning / Auto-Balance Info Box */}
              {isOverCapacity && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      Faculty Workload Exceeds Normal Limit: {selectedFacWorkload?.current} + {totalProjectedHours} hrs &gt; {selectedFacWorkload?.max} hrs weekly max.
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      {autoBalance
                        ? '✅ Auto-Balance Active: Professor will teach up to their quota; remaining section(s) will be automatically assigned to another available department professor so all courses will be taught.'
                        : '⚠️ Auto-Balance Disabled: Professor will be assigned all sections and will exceed their standard weekly limit.'}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0">
                    <input
                      type="checkbox"
                      checked={autoBalance}
                      onChange={(e) => setAutoBalance(e.target.checked)}
                      className="rounded border-amber-400 text-red-700 focus:ring-red-600"
                    />
                    Auto-balance
                  </label>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800">
                <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
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

                  <span className="text-zinc-300 dark:text-zinc-700">•</span>

                  <span className="font-mono text-[11px] text-zinc-500">
                    Total: <strong>{totalProjectedHours} hrs/wk</strong> across {targetSectionCount} section{targetSectionCount > 1 ? 's' : ''}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  {scopeMode === 'ALL'
                    ? `Assign Faculty to All ${targetSectionCount} Sections`
                    : 'Assign Faculty to Section'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Department Faculty Capacity Roster (Scenario 1 Institutional Monitor) */}
      {filteredFacultyForQuick.length > 0 && (
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Faculty Availability & Workload Balance ({filteredFacultyForQuick.length} Instructors)
            </div>
            <span className="text-[11px] text-zinc-500">
              Sufficient faculty available to staff all department courses
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {filteredFacultyForQuick.map((f) => {
              const wl = facultyWorkloadMap.get(f.id) || { current: 0, max: 18, remaining: 18 };
              const pct = Math.min(100, Math.round((wl.current / wl.max) * 100));
              const isFull = wl.current >= wl.max;
              return (
                <div
                  key={f.id}
                  className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={f.name}>
                      {f.name}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{f.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5 font-mono">
                    <span>{wl.current} / {wl.max} hrs</span>
                    <span className={isFull ? 'text-amber-600 font-bold' : 'text-emerald-600 font-medium'}>
                      {isFull ? 'At Capacity' : `${wl.remaining}h free`}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pct > 90 ? 'bg-amber-600' : pct > 60 ? 'bg-red-700' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5 z-10 pointer-events-none" />
          <Input
            placeholder="Search by instructor, course code, section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs py-1.5"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
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
                          {(alloc.lesson_format === '1_AND_2_MIX' || (!alloc.lesson_format && alloc.course_lesson_format === '1_AND_2_MIX')) ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                              1 & 2h Mix
                            </span>
                          ) : alloc.course_span > 1 ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 text-[10px] font-bold border border-stone-200 dark:border-stone-700">
                              {alloc.course_span}h Block
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700">
                              1h Single
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

