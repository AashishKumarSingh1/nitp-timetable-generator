'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  BookOpen,
  User,
  Users,
  Layers,
  FlaskConical,
  Check,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { FilterOption, CourseOption } from '../types';

interface LessonItem {
  id: string;
  section_id: string;
  section_name: string;
  course_id: string;
  course_code: string;
  course_name: string;
  course_span?: number;
  faculty_id: string;
  faculty_code: string;
  faculty_name: string;
  periods_per_week: number;
  batch?: string;
  lesson_format?: string;
  course_lesson_format?: string;
}

interface LessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseOption[];
  faculty: FilterOption[];
  sections: { id: string; name: string }[];
  onChanged: () => void;
}

export function LessonsModal({
  isOpen,
  onClose,
  courses,
  faculty,
  sections,
  onChanged,
}: LessonsModalProps) {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');

  // Add lesson form state
  const [isAdding, setIsAdding] = useState(false);
  const [formSectionId, setFormSectionId] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formFacultyId, setFormFacultyId] = useState('');
  const [formBatch, setFormBatch] = useState('ALL');
  const [formPeriods, setFormPeriods] = useState(3);
  const [formLessonFormat, setFormLessonFormat] = useState('DEFAULT');
  const [submitting, setSubmitting] = useState(false);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sections/allocations');
      const data = await res.json();
      if (data.allocations) {
        setLessons(data.allocations);
      }
    } catch (err: any) {
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLessons();
      if (sections.length > 0 && !formSectionId) {
        setFormSectionId(sections[0].id);
      }
      if (courses.length > 0 && !formCourseId) {
        setFormCourseId(courses[0].id);
      }
      if (faculty.length > 0 && !formFacultyId) {
        setFormFacultyId(faculty[0].id);
      }
    }
  }, [isOpen, sections, courses, faculty]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSectionId || !formCourseId || !formFacultyId) {
      toast.error('Please select section, course and faculty.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/sections/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'single',
          section_id: formSectionId,
          course_id: formCourseId,
          faculty_id: formFacultyId,
          periods_per_week: formPeriods,
          batch: formBatch,
          lesson_format: formLessonFormat,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create lesson.');
      }

      toast.success('Lesson demand added successfully.');
      setIsAdding(false);
      fetchLessons();
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lesson.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson demand?')) return;
    try {
      const res = await fetch(`/api/sections/allocations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Lesson demand deleted successfully.');
      fetchLessons();
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lesson.');
    }
  };

  const filteredLessons = lessons.filter((l) => {
    if (filterSection !== 'ALL' && l.section_id !== filterSection && l.section_name !== filterSection) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.course_name.toLowerCase().includes(q) ||
        l.course_code.toLowerCase().includes(q) ||
        l.faculty_name.toLowerCase().includes(q) ||
        l.section_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lessons & Teaching Demands">
      <div className="space-y-4 text-xs">
        {/* Top Controls: Filter & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="ALL">All Cohorts / Classes</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject or teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-48"
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close Form' : 'New Lesson'}</span>
          </Button>
        </div>

        {/* Add Lesson Sub-Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateLesson}
            className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3"
          >
            <div className="font-semibold text-indigo-900 dark:text-indigo-200">Add New Lesson Allocation</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Section / Cohort
                </label>
                <select
                  value={formSectionId}
                  onChange={(e) => setFormSectionId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Subject / Course
                </label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} {c.span && c.span > 1 ? `(${c.span}h Lab)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Teacher
                </label>
                <select
                  value={formFacultyId}
                  onChange={(e) => setFormFacultyId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Group / Batch
                </label>
                <select
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                >
                  <option value="ALL">Entire Class</option>
                  <option value="Batch 1">Batch 1 (Group 1)</option>
                  <option value="Batch 2">Batch 2 (Group 2)</option>
                  <option value="Batch 3">Batch 3</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Periods / Wk
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formPeriods}
                  onChange={(e) => setFormPeriods(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Lesson Format
                </label>
                <select
                  value={formLessonFormat}
                  onChange={(e) => setFormLessonFormat(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                >
                  <option value="DEFAULT">Course Default</option>
                  <option value="1_AT_A_TIME">1h Single (1+1+1)</option>
                  <option value="1_AND_2_MIX">1 & 2h Mix (2h+1h)</option>
                  <option value="2_AT_A_TIME">2h Blocks (2+2)</option>
                  <option value="3_AT_A_TIME">3h Workshop</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-indigo-600 text-white">
                {submitting ? 'Saving...' : 'Add Lesson Demand'}
              </Button>
            </div>
          </form>
        )}

        {/* Lessons Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="p-2.5">Subject</th>
                <th className="p-2.5">Teacher</th>
                <th className="p-2.5">Class</th>
                <th className="p-2.5">Group / Batch</th>
                <th className="p-2.5 text-center">Periods/Wk</th>
                <th className="p-2.5 text-center">Span</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading lessons...</span>
                  </td>
                </tr>
              ) : filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No lessons found.
                  </td>
                </tr>
              ) : (
                filteredLessons.map((lesson) => {
                  const isLab = lesson.course_span && lesson.course_span > 1;
                  return (
                    <tr
                      key={lesson.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-100">
                        <div>{lesson.course_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{lesson.course_code}</div>
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        <div>{lesson.faculty_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{lesson.faculty_code}</div>
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        {lesson.section_name}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lesson.batch && lesson.batch !== 'ALL'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {lesson.batch || 'Entire Class'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {lesson.periods_per_week}
                      </td>
                      <td className="p-2.5 text-center">
                        {(lesson.lesson_format === '1_AND_2_MIX' || (!lesson.lesson_format && lesson.course_lesson_format === '1_AND_2_MIX')) ? (
                          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            1 & 2h Mix
                          </span>
                        ) : isLab ? (
                          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {lesson.course_span}h Block
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">1h Single</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Total: {filteredLessons.length} lesson demands</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
