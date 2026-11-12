'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  BookOpen,
  Plus,
  CalendarCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Section, Department, SEMESTERS } from '../types';

interface SectionsTabProps {
  sections: Section[];
  departments: Department[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (section: Section) => void;
  onMapCourse: (section: Section) => void;
  onTimeOffSection?: (section: Section) => void;
}

export function SectionsTab({
  sections,
  departments,
  loading,
  onRefresh,
  onOpenAddModal,
  onOpenEditModal,
  onMapCourse,
  onTimeOffSection,
}: SectionsTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState<number | ''>('');

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (deptFilter && s.department_id !== deptFilter) return false;
      if (semFilter && s.semester !== Number(semFilter)) return false;
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        s.department_name.toLowerCase().includes(query) ||
        s.department_code.toLowerCase().includes(query)
      );
    });
  }, [sections, deptFilter, semFilter, query]);

  const handleDelete = async (sec: Section) => {
    if (!confirm(`Delete student section "${sec.name}" (${sec.department_code})?`)) return;
    try {
      const res = await fetch(`/api/sections/${sec.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete section');
      toast.success('Section deleted');
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
            placeholder="Search sections by name, branch code..."
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

          <Button onClick={onOpenAddModal} variant="primary" size="sm" className="text-xs shrink-0 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Section
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Showing <strong>{filtered.length}</strong> of {sections.length} student sections
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

      {/* Sections Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Section Cohort</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">Class Strength</th>
                  <th className="py-3 px-4 text-center">Mapped Courses</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-zinc-400">
                      Loading sections directory...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-red-700" />
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">No matching student sections found</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {search || deptFilter || semFilter
                          ? 'Try clearing your search query or filter selections'
                          : 'Click "+ Add Section" above to register student cohorts.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((sec) => (
                    <tr
                      key={sec.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-900/40 text-xs">
                          {sec.department_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{sec.name}</div>
                        <div className="text-[11px] text-zinc-500">{sec.department_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-bold text-[11px]">
                            Semester {sec.semester}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 text-[10px] font-medium whitespace-nowrap">
                            Lunch: After P{sec.lunch_after_period || 4}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono text-xs">
                          <Users className="w-3.5 h-3.5 text-red-700" />
                          {sec.strength} Students
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-mono text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                          {sec.assigned_courses_count} Subjects
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onTimeOffSection && (
                            <button
                              onClick={() => onTimeOffSection(sec)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 border ${
                                sec.time_off && sec.time_off !== '{}'
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                              }`}
                              title="Time Off & Availability Matrix"
                            >
                              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Time-Off</span>
                            </button>
                          )}
                          <button
                            onClick={() => onMapCourse(sec)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/80 transition-colors flex items-center gap-1 border border-red-200/60 dark:border-red-900/40"
                            title="Assign faculty courses to this section"
                          >
                            <span>Map Course</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onOpenEditModal(sec)}
                            title="Edit section"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sec)}
                            title="Delete section"
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
