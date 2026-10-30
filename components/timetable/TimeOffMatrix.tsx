'use client';

import React from 'react';
import { Check, X, RotateCcw } from 'lucide-react';

export type TimeOffState = 0 | 1 | 2; // 0 = Blocked (X), 1 = Available (Check), 2 = Conditional (?)
export type DayTimeOffMap = Record<string, TimeOffState[]>; // dayName -> [p1, p2, ..., pN]

interface TimeOffMatrixProps {
  value?: DayTimeOffMap | string | null;
  onChange: (value: DayTimeOffMap) => void;
  days?: string[];
  periodsCount?: number;
  title?: string;
  subtitle?: string;
  readOnly?: boolean;
}

const DEFAULT_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Tu',
  WEDNESDAY: 'We',
  THURSDAY: 'Th',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

export function parseTimeOff(raw: DayTimeOffMap | string | null | undefined, days: string[], periodsCount: number): DayTimeOffMap {
  const result: DayTimeOffMap = {};
  let parsed: any = null;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  } else if (raw && typeof raw === 'object') {
    parsed = raw;
  }

  for (const day of days) {
    if (parsed && Array.isArray(parsed[day])) {
      result[day] = [];
      for (let p = 0; p < periodsCount; p++) {
        const val = parsed[day][p];
        result[day][p] = val === 0 || val === 1 || val === 2 ? val : 1;
      }
    } else {
      // Default: all available (1)
      result[day] = Array(periodsCount).fill(1);
    }
  }
  return result;
}

export function TimeOffMatrix({
  value,
  onChange,
  days = DEFAULT_DAYS,
  periodsCount = 8,
  title,
  subtitle,
  readOnly = false,
}: TimeOffMatrixProps) {
  const matrix = React.useMemo(() => parseTimeOff(value, days, periodsCount), [value, days, periodsCount]);

  const cycleState = (current: TimeOffState): TimeOffState => {
    if (current === 1) return 2; // Available -> Conditional
    if (current === 2) return 0; // Conditional -> Blocked
    return 1; // Blocked -> Available
  };

  const handleCellClick = (day: string, periodIndex: number) => {
    if (readOnly) return;
    const current = matrix[day]?.[periodIndex] ?? 1;
    const next = cycleState(current);
    const updated: DayTimeOffMap = {
      ...matrix,
      [day]: [...matrix[day]],
    };
    updated[day][periodIndex] = next;
    onChange(updated);
  };

  // Toggle entire day row
  const handleDayClick = (day: string) => {
    if (readOnly) return;
    const row = matrix[day] || [];
    const allAvailable = row.every((s) => s === 1);
    const allBlocked = row.every((s) => s === 0);
    const targetState: TimeOffState = allAvailable ? 0 : allBlocked ? 1 : 1;

    const updated: DayTimeOffMap = {
      ...matrix,
      [day]: Array(periodsCount).fill(targetState),
    };
    onChange(updated);
  };

  // Toggle entire period column
  const handlePeriodClick = (periodIdx: number) => {
    if (readOnly) return;
    const colValues = days.map((d) => matrix[d]?.[periodIdx] ?? 1);
    const allAvailable = colValues.every((s) => s === 1);
    const targetState: TimeOffState = allAvailable ? 0 : 1;

    const updated: DayTimeOffMap = { ...matrix };
    for (const d of days) {
      updated[d] = [...(matrix[d] || Array(periodsCount).fill(1))];
      updated[d][periodIdx] = targetState;
    }
    onChange(updated);
  };

  // Presets
  const setAll = (state: TimeOffState) => {
    if (readOnly) return;
    const updated: DayTimeOffMap = {};
    for (const d of days) {
      updated[d] = Array(periodsCount).fill(state);
    }
    onChange(updated);
  };

  const setAfternoonsAvoid = () => {
    if (readOnly) return;
    const updated: DayTimeOffMap = {};
    for (const d of days) {
      updated[d] = Array(periodsCount).fill(1);
      for (let p = 4; p < periodsCount; p++) {
        updated[d][p] = 2;
      }
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {title && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}

      {/* Quick Action Presets */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => setAll(1)}
            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium transition cursor-pointer"
          >
            All Available
          </button>
          <button
            type="button"
            onClick={setAfternoonsAvoid}
            className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-medium transition cursor-pointer"
          >
            Avoid Afternoons
          </button>
          <button
            type="button"
            onClick={() => setAll(0)}
            className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 font-medium transition cursor-pointer"
          >
            Block All
          </button>
          <button
            type="button"
            onClick={() => setAll(1)}
            className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Grid Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full border-collapse select-none text-center text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <th className="p-2 text-slate-400 font-medium w-12 text-center">Day</th>
              {Array.from({ length: periodsCount }).map((_, pIdx) => (
                <th
                  key={pIdx}
                  onClick={() => handlePeriodClick(pIdx)}
                  title={!readOnly ? `Click to toggle Period ${pIdx + 1} for all days` : undefined}
                  className={`p-2 font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800 transition ${
                    !readOnly ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700' : ''
                  }`}
                >
                  P{pIdx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const row = matrix[day] || Array(periodsCount).fill(1);
              return (
                <tr key={day} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800/60">
                  <td
                    onClick={() => handleDayClick(day)}
                    title={!readOnly ? `Click to toggle all periods for ${DAY_ABBR[day] || day}` : undefined}
                    className={`p-2 font-bold text-slate-700 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 ${
                      !readOnly ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700' : ''
                    }`}
                  >
                    {DAY_ABBR[day] || day.slice(0, 3)}
                  </td>
                  {row.map((state: TimeOffState, pIdx: number) => {
                    const isAvailable = state === 1;
                    const isConditional = state === 2;
                    const isBlocked = state === 0;

                    let bgClass = 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
                    if (isConditional) {
                      bgClass = 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400';
                    } else if (isBlocked) {
                      bgClass = 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400';
                    }

                    return (
                      <td
                        key={pIdx}
                        onClick={() => handleCellClick(day, pIdx)}
                        className={`p-2 border-l border-slate-100 dark:border-slate-800 transition ${bgClass} ${
                          !readOnly ? 'cursor-pointer' : ''
                        }`}
                        title={
                          isAvailable
                            ? 'Available (Click to make Conditional)'
                            : isConditional
                            ? 'Conditional / Avoid (Click to Block)'
                            : 'Blocked / Unavailable (Click to make Available)'
                        }
                      >
                        <div className="flex items-center justify-center">
                          {isAvailable && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                          {isConditional && (
                            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs font-bold text-[10px]">
                              ?
                            </div>
                          )}
                          {isBlocked && (
                            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[9px]">
              ?
            </span>
            <span>Conditional (Avoid)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <X className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>Not Available (Blocked)</span>
          </div>
        </div>
        {!readOnly && <span className="text-[11px] italic">Click any cell or row/column header to cycle state</span>}
      </div>
    </div>
  );
}
