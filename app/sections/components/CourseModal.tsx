'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Course, Department, SEMESTERS } from '../types';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      setCode(editingCourse.code);
      setName(editingCourse.name);
      setDepartmentId(editingCourse.department_id);
      setSemester(editingCourse.semester || 3);
      setPeriods(editingCourse.periods_per_week || 3);
      setSpan(editingCourse.span || 1);
    } else {
      setCode('');
      setName('');
      setDepartmentId(defaultDeptId || departments[0]?.id || '');
      setSemester(defaultSemester || 3);
      setPeriods(3);
      setSpan(1);
    }
  }, [editingCourse, departments, defaultDeptId, defaultSemester, isOpen]);

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
            label="Course Format & Span"
            value={span}
            onChange={(e) => setSpan(Number(e.target.value))}
          >
            <option value={1}>1 Period (Theory Lecture)</option>
            <option value={2}>2 Periods (Laboratory Block)</option>
            <option value={3}>3 Periods (Workshop / Project)</option>
          </Select>

          <Input
            label="Weekly Periods"
            type="number"
            min={1}
            max={10}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            required
          />
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
