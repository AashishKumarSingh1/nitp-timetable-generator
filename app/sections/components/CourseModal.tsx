'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Course, Department, SEMESTERS } from '../types';
import { calculateSessionSpans, type LessonFormat } from '@/app/schedule/types';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourse: Course | null;
  departments: Department[];
  defaultDeptId?: string;
  defaultSemester?: number;
  onSaved: () => void;
}

export function CourseModal({
  isOpen,
  onClose,
  editingCourse,
  departments,
  defaultDeptId,
  defaultSemester = 3,
  onSaved,
}: CourseModalProps) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [semester, setSemester] = useState(defaultSemester);
  const [periods, setPeriods] = useState(3);
  const [span, setSpan] = useState(1);
  const [lessonFormat, setLessonFormat] = useState<LessonFormat>('1_AT_A_TIME');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      setCode(editingCourse.code);
      setName(editingCourse.name);
      setDepartmentId(editingCourse.department_id);
      setSemester(editingCourse.semester || 3);
      setPeriods(editingCourse.periods_per_week || 3);
      setSpan(editingCourse.span || 1);
      const initialFmt: LessonFormat = editingCourse.lesson_format || (editingCourse.span === 2 ? '2_AT_A_TIME' : editingCourse.span === 3 ? '3_AT_A_TIME' : '1_AT_A_TIME');
      setLessonFormat(initialFmt);
    } else {
      setCode('');
      setName('');
      setDepartmentId(defaultDeptId || departments[0]?.id || '');
      setSemester(defaultSemester || 3);
      setPeriods(3);
      setSpan(1);
      setLessonFormat('1_AT_A_TIME');
    }
  }, [editingCourse, departments, defaultDeptId, defaultSemester, isOpen]);

  const handleFormatChange = (fmt: LessonFormat) => {
    setLessonFormat(fmt);
    if (fmt === '1_AT_A_TIME') setSpan(1);
    else if (fmt === '1_AND_2_MIX') setSpan(2);
    else if (fmt === '2_AT_A_TIME') setSpan(2);
    else if (fmt === '3_AT_A_TIME') setSpan(3);
  };

  const previewSpans = calculateSessionSpans(periods, lessonFormat, span);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !departmentId) {
      toast.error('Please enter course code, title, and select department');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department_id: departmentId,
        semester: Number(semester),
        periods_per_week: Number(periods),
        span: Number(span),
        lesson_format: lessonFormat,
      };

      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save course');

      toast.success(editingCourse ? 'Course updated!' : 'New course added to curriculum!');
      onClose();
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCourse ? `Edit Course ${editingCourse.code}` : 'Add New Curriculum Course'}
      description="Define subject syllabus, semester allocation (Sem 1–10), and weekly lecture hours"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Course Code"
            placeholder="e.g. CS501, ME302"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />

          <Select
            label="Target Semester"
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s} {s > 8 ? '(PG / Dual)' : ''}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Course Title"
          placeholder="e.g. Distributed Operating Systems"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select
          label="Department / Engineering Discipline"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          required
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} - {d.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Lesson Distribution / Format"
            value={lessonFormat}
            onChange={(e) => handleFormatChange(e.target.value as any)}
          >
            <option value="1_AT_A_TIME">1 hour at a time (e.g. 1 + 1 + 1)</option>
            <option value="1_AND_2_MIX">1 and 2 mix (e.g. 2h block + 1h lectures)</option>
            <option value="2_AT_A_TIME">2 hours at a time (e.g. 2h lab blocks)</option>
            <option value="3_AT_A_TIME">3 hours at a time (e.g. 3h workshop / studio)</option>
          </Select>

          <Input
            label="Weekly Periods (Hours)"
            type="number"
            min={1}
            max={10}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            required
          />
        </div>

        {/* Live Session Distribution Breakdown Preview */}
        <div className="px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-red-700" />
            <span>Weekly Schedule Breakdown:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {previewSpans.map((s, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                  s > 1
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                }`}
              >
                {s}h {s > 1 ? 'Block' : 'Lecture'}
              </span>
            ))}
            <span className="text-zinc-400 font-semibold text-[11px] ml-1">
              ({previewSpans.length} session{previewSpans.length > 1 ? 's' : ''}/wk)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {editingCourse ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
