'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Section, Department, SEMESTERS } from '../types';

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSection: Section | null;
  departments: Department[];
  onSaved: () => void;
}

export function SectionModal({
  isOpen,
  onClose,
  editingSection,
  departments,
  onSaved,
}: SectionModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('Section A');
  const [departmentId, setDepartmentId] = useState('');
  const [semester, setSemester] = useState(3);
  const [strength, setStrength] = useState(60);
  const [lunchAfterPeriod, setLunchAfterPeriod] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSection) {
      setName(editingSection.name);
      setDepartmentId(editingSection.department_id);
      setSemester(editingSection.semester);
      setStrength(editingSection.strength);
      setLunchAfterPeriod(editingSection.lunch_after_period ?? 4);
    } else {
      setName('Section A');
      setDepartmentId(departments[0]?.id || '');
      setSemester(3);
      setStrength(60);
      setLunchAfterPeriod(4);
    }
  }, [editingSection, departments, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !departmentId) {
      toast.error('Please enter section name and select department');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        department_id: departmentId,
        semester: Number(semester),
        strength: Number(strength),
        lunch_after_period: Number(lunchAfterPeriod) || 4,
      };

      const url = editingSection ? `/api/sections/${editingSection.id}` : '/api/sections';
      const method = editingSection ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save section');

      toast.success(editingSection ? 'Section updated!' : 'New student section created!');
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
      title={editingSection ? 'Edit Student Section' : 'Create New Student Section'}
      description="Configure student batch section, department, semester (Sem 1–10), and seat capacity"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Section Name"
          placeholder="e.g. Section A, Section B, CSE-Batch-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select
          label="Department / Engineering Branch"
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
            label="Academic Semester (1 to 10)"
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s} {s > 8 ? '(Dual / Integrated M.Tech)' : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Student Strength"
            type="number"
            min={1}
            max={250}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            required
          />
        </div>

        <Select
          label="Lunch Break Slot (Recess Timing)"
          value={lunchAfterPeriod}
          onChange={(e) => setLunchAfterPeriod(Number(e.target.value))}
        >
          <option value={3}>Early Lunch: Recess after Period 3 (11:30 - 12:25)</option>
          <option value={4}>Standard Lunch: Recess after Period 4 (12:25 - 13:30)</option>
          <option value={5}>Late Lunch: Recess after Period 5 (13:30 - 14:25)</option>
        </Select>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {editingSection ? 'Update Section' : 'Create Section'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
