'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TimeOffMatrix, DayTimeOffMap, parseTimeOff } from '@/components/timetable/TimeOffMatrix';
import { useToast } from '@/components/ui/Toast';

export interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'FACULTY' | 'ROOM' | 'SECTION';
  entity: { id: string; name: string; code?: string; time_off?: string | null } | null;
  onSaved: () => void;
  workingDays?: 5 | 6;
  periodsCount?: number;
}

export function TimeOffModal({
  isOpen,
  onClose,
  entityType,
  entity,
  onSaved,
  workingDays = 5,
  periodsCount = 8,
}: TimeOffModalProps) {
  const { toast } = useToast();
  const days = workingDays === 6
    ? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  const [matrix, setMatrix] = useState<DayTimeOffMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entity) {
      setMatrix(parseTimeOff(entity.time_off, days, periodsCount));
    }
  }, [entity, workingDays, periodsCount]);

  if (!entity) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      let url = '';
      if (entityType === 'FACULTY') {
        url = `/api/faculty/${entity.id}`;
      } else if (entityType === 'ROOM') {
        url = `/api/rooms/${entity.id}`;
      } else {
        url = `/api/sections/${entity.id}`;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_off: matrix }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update time-off settings.');
      }

      const label = entityType === 'FACULTY' ? 'Faculty member' : entityType === 'ROOM' ? 'Classroom' : 'Section';
      toast.success(`Availability matrix for ${label} "${entity.name}" saved successfully.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save time-off settings.');
    } finally {
      setSaving(false);
    }
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'FACULTY':
        return 'teacher';
      case 'ROOM':
        return 'classroom/lab';
      case 'SECTION':
        return 'student cohort';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Time Off & Availability - ${entity.name} (${entity.code || entityType})`}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Set periods where this {getEntityLabel()} is available (🟩),
          preferred to avoid (❓), or strictly unavailable / blocked (❌). The timetable generator will strictly adhere to these constraints.
        </p>

        <TimeOffMatrix
          value={matrix}
          onChange={setMatrix}
          days={days}
          periodsCount={periodsCount}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white">
            {saving ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
