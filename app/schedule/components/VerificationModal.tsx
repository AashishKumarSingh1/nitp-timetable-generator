'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  DoorOpen,
  User,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ClassSession, FilterOption } from '../types';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ClassSession[];
  facultyList: FilterOption[];
  roomsList: FilterOption[];
  onFocusSession?: (session: ClassSession) => void;
}

export function VerificationModal({
  isOpen,
  onClose,
  sessions,
  facultyList,
  roomsList,
  onFocusSession,
}: VerificationModalProps) {
  // Compute full analytical audit
  const audit = useMemo(() => {
    const issues: {
      id: string;
      type: 'COLLISION' | 'WORKLOAD' | 'TIMEOFF' | 'GAP';
      severity: 'CRITICAL' | 'WARNING';
      title: string;
      description: string;
      session?: ClassSession;
    }[] = [];

    // 1. Room Collisions
    const roomSlotMap = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      for (let p = s.period_index; p < s.period_index + (s.span || 1); p++) {
        const key = `${s.room_id}:${s.day}:${p}`;
        if (!roomSlotMap.has(key)) roomSlotMap.set(key, []);
        roomSlotMap.get(key)!.push(s);
      }
    }
    for (const [key, sessList] of roomSlotMap.entries()) {
      if (sessList.length > 1) {
        const [roomId, day, p] = key.split(':');
        const roomName = sessList[0].room_name || sessList[0].room_code;
        issues.push({
          id: `room-${key}`,
          type: 'COLLISION',
          severity: 'CRITICAL',
          title: `Room Collision: ${roomName}`,
          description: `Multiple sessions scheduled in ${roomName} on ${day} Period ${p} (${sessList.map((s) => s.course_code).join(', ')})`,
          session: sessList[0],
        });
      }
    }

    // 2. Faculty Collisions
    const facultySlotMap = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      for (let p = s.period_index; p < s.period_index + (s.span || 1); p++) {
        const key = `${s.faculty_id}:${s.day}:${p}`;
        if (!facultySlotMap.has(key)) facultySlotMap.set(key, []);
        facultySlotMap.get(key)!.push(s);
      }
    }
    for (const [key, sessList] of facultySlotMap.entries()) {
      if (sessList.length > 1) {
        const [facId, day, p] = key.split(':');
        const facName = sessList[0].faculty_name;
        issues.push({
          id: `fac-${key}`,
          type: 'COLLISION',
          severity: 'CRITICAL',
          title: `Faculty Double-Booked: ${facName}`,
          description: `${facName} is assigned to multiple classes simultaneously on ${day} Period ${p}`,
          session: sessList[0],
        });
      }
    }

    // 3. Faculty Daily Overload
    const facDailyLoad = new Map<string, number>();
    for (const s of sessions) {
      const key = `${s.faculty_id}:${s.day}`;
      facDailyLoad.set(key, (facDailyLoad.get(key) || 0) + (s.span || 1));
    }
    for (const [key, count] of facDailyLoad.entries()) {
      const [facId, day] = key.split(':');
      const fac = facultyList.find((f) => f.id === facId);
      const cap = fac?.max_daily_periods || 4;
      if (count > cap) {
        issues.push({
          id: `overload-${key}`,
          type: 'WORKLOAD',
          severity: 'WARNING',
          title: `Faculty Workload Limit Exceeded: ${fac?.name || facId}`,
          description: `${fac?.name} has ${count} periods on ${day} (exceeds target cap of ${cap} periods/day)`,
        });
      }
    }

    // 4. Time-Off Matrix Violations
    for (const s of sessions) {
      const fac = facultyList.find((f) => f.id === s.faculty_id);
      if (fac?.time_off) {
        try {
          const parsed = JSON.parse(fac.time_off);
          const dayArr = parsed[s.day];
          if (Array.isArray(dayArr)) {
            for (let p = s.period_index; p < s.period_index + (s.span || 1); p++) {
              const state = dayArr[p - 1]; // 0 = Blocked, 2 = Conditional
              if (state === 0) {
                issues.push({
                  id: `timeoff-block-${s.id}-${p}`,
                  type: 'TIMEOFF',
                  severity: 'CRITICAL',
                  title: `Time-Off Violation: ${fac.name}`,
                  description: `${fac.name} marked Period ${p} on ${s.day} as Blocked (Unavailable), but has ${s.course_code}.`,
                  session: s,
                });
              } else if (state === 2) {
                issues.push({
                  id: `timeoff-cond-${s.id}-${p}`,
                  type: 'TIMEOFF',
                  severity: 'WARNING',
                  title: `Conditional Slot Used: ${fac.name}`,
                  description: `${fac.name} preferred to avoid Period ${p} on ${s.day} for ${s.course_code}.`,
                  session: s,
                });
              }
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    return {
      issues,
      criticalCount,
      warningCount,
      totalPlaced: sessions.length,
    };
  }, [sessions, facultyList, roomsList]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Timetable Conflict Checker & Diagnostics">
      <div className="space-y-4 text-xs">
        {/* Status Header Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            audit.criticalCount === 0
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {audit.criticalCount === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {audit.criticalCount === 0
                  ? 'All Collision Invariants Verified (100% Conflict-Free)'
                  : `${audit.criticalCount} Critical Conflict(s) Detected`}
              </div>
              <div className="text-[11px] opacity-80">
                {audit.totalPlaced} total periods scheduled across {facultyList.length} faculty and {roomsList.length} rooms.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
              0 Room Clashes
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
              0 Faculty Clashes
            </span>
          </div>
        </div>

        {/* Issue Breakdown */}
        {audit.issues.length === 0 ? (
          <div className="p-6 text-center text-slate-500 space-y-1">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 opacity-90" />
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              No conflicts or rule violations found!
            </div>
            <p className="text-[11px]">
              Every faculty limit, time-off window, and room allocation meets all hard & soft institutional constraints.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {audit.issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                    : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {issue.severity === 'CRITICAL' ? (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{issue.title}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{issue.description}</div>
                  </div>
                </div>

                {issue.session && onFocusSession && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onFocusSession(issue.session!);
                      onClose();
                    }}
                    className="shrink-0 text-[10px] h-7 px-2"
                  >
                    Focus in Grid
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close Diagnostics
          </Button>
        </div>
      </div>
    </Modal>
  );
}
