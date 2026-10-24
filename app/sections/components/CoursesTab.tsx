'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Pencil,
  Trash2,
  Plus,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Course, Department, SEMESTERS } from '../types';

interface CoursesTabProps {
  courses: Course[];
  departments: Department[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (course: Course) => void;
}

export function CoursesTab({
  courses,
  departments,
  loading,
  onRefresh,
  onOpenAddModal,
  onOpenEditModal,
}: CoursesTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState<number | ''>('');
  const [spanFilter, setSpanFilter] = useState<'ALL' | 'THEORY' | 'LAB'>('ALL');

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (deptFilter && c.department_id !== deptFilter) return false;
      if (semFilter && c.semester !== Number(semFilter)) return false;
      if (spanFilter === 'THEORY' && (c.span || 1) > 1) return false;
      if (spanFilter === 'LAB' && (c.span || 1) <= 1) return false;
      if (!query) return true;
      return (
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.department_code?.toLowerCase().includes(query) ||
        c.department_name?.toLowerCase().includes(query)
      );
    });
  }, [courses, deptFilter, semFilter, spanFilter, query]);

  const handleDelete = async (c: Course) => {
    if (!confirm(`Delete course "${c.code} - ${c.name}"?`)) return;
    try {
      const res = await fetch(`/api/courses/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete course');
      toast.success('Course deleted');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5 z-10 pointer-events-none" />
          <Input
            placeholder="Search by course code or subject title..."
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

          <Select
            value={spanFilter}
            onChange={(e) => setSpanFilter(e.target.value as any)}
            className="text-xs py-1.5 w-full sm:w-32"
          >
            <option value="ALL">All Formats</option>
            <option value="THEORY">Theory Only</option>
            <option value="LAB">Labs & Practical</option>
          </Select>

          <Button onClick={onOpenAddModal} variant="primary" size="sm" className="text-xs shrink-0 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Course
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Showing <strong>{filtered.length}</strong> of {courses.length} curriculum courses
        </span>
        {(deptFilter || semFilter || spanFilter !== 'ALL' || search) && (
          <button
            onClick={() => {
              setSearch('');
              setDeptFilter('');
              setSemFilter('');
              setSpanFilter('ALL');
            }}
            className="text-red-700 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Courses Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Course Code</th>
                  <th className="py-3 px-4">Subject Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">Format & Span</th>
                  <th className="py-3 px-4 text-center">Weekly Load</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-400">
                      Loading curriculum courses...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-zinc-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-red-700" />
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">No matching courses found</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {search || deptFilter || semFilter || spanFilter !== 'ALL'
                          ? 'Try clearing your search query or adjusting the filters'
                          : 'Click "+ Add Course" above to register new syllabus courses.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-700 font-mono text-xs">
                          {c.department_code || c.department_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-bold text-[11px]">
                          Semester {c.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {c.span > 1 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 font-bold border border-stone-200 dark:border-stone-700 inline-flex items-center gap-1.5 text-xs">
                            <FlaskConical className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                            {c.span}h Lab Block
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700 inline-flex items-center gap-1.5 text-xs">
                            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                            1h Theory
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {c.periods_per_week} hrs/wk
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenEditModal(c)}
                            title="Edit course"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            title="Delete course"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
