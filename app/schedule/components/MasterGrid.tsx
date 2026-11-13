'use client';

import React, { useMemo } from 'react';
import {
  Pin,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Clock,
  DoorOpen,
  User,
  FlaskConical,
  Utensils,
  Layers,
} from 'lucide-react';
import {
  ClassSession,
  StudioPerspective,
  GridDensity,
  PeriodSlot,
  UnplacedDemand,
  DAYS,
  DAY_ABBR,
  getCourseTheme,
  isLabSession,
  isSameSection,
} from '../types';

interface MasterGridProps {
  sessions: ClassSession[];
  perspective: StudioPerspective;
  density: GridDensity;
  workingDays: 5 | 6;
  periods: PeriodSlot[];
  hasLunchBreak: boolean;
  lunchAfterPeriod: number;
  lunchLabel?: string;
  selectedDemand: UnplacedDemand | null;
  onPlaceDemand: (day: string, periodIndex: number, rowEntityId: string) => void;
  onEditSession: (session: ClassSession) => void;
  onEmptyCellClick?: (day: string, periodIndex: number, rowEntity: { id: string; name: string }) => void;
  onTogglePinSession: (session: ClassSession) => void;
  onDeleteSession: (sessionId: string) => void;
  // Master entity lists
  sections: string[];
  facultyList: { id: string; name: string; code?: string; color?: string | null; time_off?: string | null }[];
  roomsList: { id: string; name: string; code?: string; type?: string; color?: string | null; time_off?: string | null }[];
  searchQuery?: string;
  sectionLunchMap?: Record<string, number>;
}

export function MasterGrid({
  sessions,
  perspective,
  density,
  workingDays,
  periods,
  hasLunchBreak,
  lunchAfterPeriod,
  lunchLabel = 'LUNCH',
  selectedDemand,
  onPlaceDemand,
  onEditSession,
  onEmptyCellClick,
  onTogglePinSession,
  onDeleteSession,
  sections,
  facultyList,
  roomsList,
  searchQuery = '',
  sectionLunchMap = {},
}: MasterGridProps) {
  const activeDays = useMemo(() => DAYS.slice(0, workingDays), [workingDays]);

  // Determine row entities based on perspective
  const rowEntities = useMemo(() => {
    let rows: { id: string; name: string; code: string; subtitle?: string; color?: string | null; timeOff?: string | null }[] = [];

    if (perspective === 'SECTIONS') {
      rows = sections.map((sec) => ({
        id: sec,
        name: sec,
        code: sec.replace(/Section\s*/i, 'Sec-'),
        subtitle: 'Cohort',
      }));
    } else if (perspective === 'FACULTY') {
      rows = facultyList.map((f) => ({
        id: f.id,
        name: f.name,
        code: f.code || f.name.slice(0, 3).toUpperCase(),
        subtitle: f.code,
        color: f.color,
        timeOff: f.time_off,
      }));
    } else if (perspective === 'ROOMS') {
      rows = roomsList.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code || r.name,
        subtitle: r.type?.replace('_', ' '),
        color: r.color,
        timeOff: r.time_off,
      }));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.subtitle && r.subtitle.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [perspective, sections, facultyList, roomsList, searchQuery]);

  // Index sessions by rowEntityId:day:periodIndex
  // A cell might contain multiple sessions (e.g. split lab batches B1 and B2!)
  const cellSessionsMap = useMemo(() => {
    const map = new Map<string, ClassSession[]>();

    for (const session of sessions) {
      let rowKey = '';
      if (perspective === 'SECTIONS') {
        const matched =
          rowEntities.find((r) => r.id === session.section_name) ||
          rowEntities.find((r) => isSameSection(r.id, session.section_name));
        rowKey = matched ? matched.id : session.section_name;
      } else if (perspective === 'FACULTY') {
        rowKey = session.faculty_id;
      } else if (perspective === 'ROOMS') {
        rowKey = session.room_id;
      }

      if (!rowKey) continue;

      // Register session for each period it spans
      const startP = session.period_index;
      const span = session.span || 1;

      for (let p = startP; p < startP + span; p++) {
        const cellKey = `${rowKey}:${session.day}:${p}`;
        if (!map.has(cellKey)) {
          map.set(cellKey, []);
        }
        // Avoid duplicate references if span > 1
        const existing = map.get(cellKey)!;
        if (!existing.some((s) => s.id === session.id)) {
          existing.push(session);
        }
      }
    }
    return map;
  }, [sessions, perspective, rowEntities]);

  // Helper: check conflict for cell when selectedDemand is active
  const checkPlacementCandidate = (rowEntityId: string, day: string, periodIndex: number) => {
    if (!selectedDemand) return { canPlace: false, reason: '' };

    const span = selectedDemand.span || 1;
    const periodsToOccupy: number[] = [];
    for (let p = periodIndex; p < periodIndex + span; p++) {
      periodsToOccupy.push(p);
    }

    // Check bounds
    if (periodIndex + span - 1 > periods.length) {
      return { canPlace: false, reason: `Span of ${span} periods exceeds daily schedule.` };
    }

    // Check lunch recess cross
    const targetSection = selectedDemand.sectionName;
    const effectiveLunch = (targetSection && sectionLunchMap && sectionLunchMap[targetSection])
      || (perspective === 'SECTIONS' && sectionLunchMap && sectionLunchMap[rowEntityId])
      || lunchAfterPeriod;

    if (hasLunchBreak && effectiveLunch > 0) {
      if (periodIndex <= effectiveLunch && periodIndex + span - 1 > effectiveLunch) {
        return { canPlace: false, reason: `Session cannot cross lunch recess after Period ${effectiveLunch}.` };
      }
    }

    // Row perspective compatibility
    if (perspective === 'SECTIONS' && !isSameSection(rowEntityId, selectedDemand.sectionName)) {
      return { canPlace: false, reason: `Selected lesson belongs to ${selectedDemand.sectionName}.` };
    }
    if (perspective === 'FACULTY' && rowEntityId !== selectedDemand.facultyId) {
      return { canPlace: false, reason: `Selected lesson belongs to ${selectedDemand.facultyName}.` };
    }

    // Check collision for each period in span
    for (const p of periodsToOccupy) {
      // 1. Is Faculty free at this slot?
      const facClash = sessions.find(
        (s) =>
          s.faculty_id === selectedDemand.facultyId &&
          s.day === day &&
          p >= s.period_index &&
          p < s.period_index + (s.span || 1)
      );
      if (facClash) {
        return {
          canPlace: false,
          reason: `Faculty ${selectedDemand.facultyName} already has ${facClash.course_code} (${facClash.section_name}) at this time.`,
        };
      }

      // 2. Is Section free at this slot (respecting batch)?
      const secClash = sessions.find((s) => {
        if (!isSameSection(s.section_name, selectedDemand.sectionName) || s.day !== day) return false;
        const overlaps = p >= s.period_index && p < s.period_index + (s.span || 1);
        if (!overlaps) return false;
        // Batch clash: if either is ALL, or batches match
        return (
          !selectedDemand.batch ||
          selectedDemand.batch === 'ALL' ||
          !s.batch ||
          s.batch === 'ALL' ||
          s.batch === selectedDemand.batch
        );
      });
      if (secClash) {
        return {
          canPlace: false,
          reason: `Cohort ${selectedDemand.sectionName} already has ${secClash.course_code} scheduled at this time.`,
        };
      }
    }

    return { canPlace: true, reason: 'Valid slot' };
  };

  // Density styles
  const densityStyles = {
    compact: {
      cellMinHeight: 'h-12 min-h-[48px]',
      fontSize: 'text-[10px]',
      badgeSize: 'text-[9px] px-1 py-0.2',
      colWidth: 'min-w-[80px]',
    },
    normal: {
      cellMinHeight: 'h-16 min-h-[64px]',
      fontSize: 'text-xs',
      badgeSize: 'text-[10px] px-1.5 py-0.5',
      colWidth: 'min-w-[110px]',
    },
    comfortable: {
      cellMinHeight: 'h-20 min-h-[80px]',
      fontSize: 'text-xs',
      badgeSize: 'text-xs px-2 py-0.5',
      colWidth: 'min-w-[140px]',
    },
  }[density];

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-md">
      {/* Scrollable Container with sticky headers & sticky entity column */}
      <div className="overflow-x-auto max-h-[75vh] relative">
        <table className="w-full border-collapse text-left border-spacing-0">
          {/* Header Row: Days & Periods */}
          <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
            {/* Day Header Row */}
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-800 dark:text-slate-100 border-r border-b border-slate-300 dark:border-slate-700 w-44 min-w-[176px] shadow-sm text-xs"
              >
                <div className="flex items-center justify-between">
                  <span>
                    {perspective === 'SECTIONS'
                      ? 'Classes / Cohorts'
                      : perspective === 'FACULTY'
                      ? 'Teachers'
                      : 'Classrooms'}
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">({rowEntities.length})</span>
                </div>
              </th>

              {activeDays.map((day, dayIdx) => {
                // Calculate column span: number of periods + lunch column if enabled
                const colSpan = periods.length + (hasLunchBreak ? 1 : 0);
                const isDayEnd = dayIdx < activeDays.length - 1;
                return (
                  <th
                    key={day}
                    colSpan={colSpan}
                    className={`p-2 text-center font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 ${
                      isDayEnd
                        ? 'border-r-2 border-r-black dark:border-r-zinc-300'
                        : 'border-r border-slate-300 dark:border-slate-700'
                    } bg-slate-200/70 dark:bg-slate-800/90`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>

            {/* Period Sub-Header Row */}
            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {activeDays.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  {periods.map((period, pIdx) => {
                    const isAfterLunch = hasLunchBreak && period.index === lunchAfterPeriod;
                    const isLastPeriodOfDay = pIdx === periods.length - 1;
                    const isDayEnd = isLastPeriodOfDay && dayIdx < activeDays.length - 1;
                    return (
                      <React.Fragment key={`${day}-p${period.index}`}>
                        <th
                          className={`p-1.5 text-center font-medium ${
                            isDayEnd
                              ? 'border-r-2 border-r-black dark:border-r-zinc-300'
                              : 'border-r border-slate-200 dark:border-slate-700/80'
                          } bg-slate-50 dark:bg-slate-800/60 ${densityStyles.colWidth}`}
                        >
                          <div className="font-bold text-slate-700 dark:text-slate-200">P{period.index}</div>
                          <div className="text-[9px] text-slate-400 font-normal truncate">{period.time}</div>
                        </th>

                        {/* Lunch Recess Divider Header */}
                        {isAfterLunch && (
                          <th className="p-1 text-center font-bold text-[10px] bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-r-2 border-amber-300/80 dark:border-amber-800 w-9 min-w-[36px]">
                            <div className="flex flex-col items-center justify-center">
                              <Utensils className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            </div>
                          </th>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* Table Body: Rows for each entity */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rowEntities.length === 0 ? (
              <tr>
                <td
                  colSpan={activeDays.length * (periods.length + (hasLunchBreak ? 1 : 0)) + 1}
                  className="p-8 text-center text-slate-500 text-xs"
                >
                  No entities found matching your search.
                </td>
              </tr>
            ) : (
              rowEntities.map((rowEntity, rowIdx) => {
                const rowLunch = (perspective === 'SECTIONS' && sectionLunchMap && (sectionLunchMap[rowEntity.name] || sectionLunchMap[rowEntity.id]))
                  || lunchAfterPeriod;
                const hasCustomLunch = perspective === 'SECTIONS' && rowLunch !== lunchAfterPeriod;

                return (
                  <tr
                    key={rowEntity.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group ${
                      rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                    }`}
                  >
                    {/* Sticky Entity Header Column */}
                    <th className="sticky left-0 z-20 bg-inherit p-2.5 font-medium border-r border-slate-200 dark:border-slate-800 shadow-xs text-xs">
                      <div className="flex items-center gap-2">
                        {rowEntity.color && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: rowEntity.color }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {rowEntity.name}
                          </div>
                          {rowEntity.subtitle && (
                            <div className="text-[10px] text-slate-400 truncate">{rowEntity.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </th>

                    {/* Period Cells across all active days */}
                    {activeDays.map((day, dayIdx) => (
                      <React.Fragment key={`${rowEntity.id}-${day}`}>
                        {periods.map((period, pIdx) => {
                          const cellKey = `${rowEntity.id}:${day}:${period.index}`;
                          const cellSessions = cellSessionsMap.get(cellKey) || [];
                          const isAfterLunch = hasLunchBreak && period.index === lunchAfterPeriod;
                          const isCustomSectionLunchBoundary = hasLunchBreak && hasCustomLunch && period.index === rowLunch;
                          const isLastPeriodOfDay = pIdx === periods.length - 1;
                          const isDayEnd = isLastPeriodOfDay && dayIdx < activeDays.length - 1;

                          // Check if this cell is entirely part of an ongoing multi-period span started in an earlier period
                          const isContinuation = cellSessions.length > 0 && cellSessions.every((s) => s.period_index < period.index);
                          if (isContinuation) {
                            return isAfterLunch ? (
                              <td
                                key={`lunch-${cellKey}`}
                                className={`${
                                  hasCustomLunch
                                    ? 'bg-slate-100/50 dark:bg-slate-800/40 border-r border-dashed border-slate-300 dark:border-slate-700'
                                    : 'bg-amber-100/40 dark:bg-amber-950/20 border-r-2 border-amber-300/60 dark:border-amber-800'
                                } text-center p-0.5 select-none w-9 min-w-[36px]`}
                              >
                                <div className="h-full flex items-center justify-center">
                                  {hasCustomLunch ? (
                                    <span
                                      className="text-[8px] font-bold text-amber-600 dark:text-amber-400 leading-tight px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300/50"
                                      title={`Recess for ${rowEntity.name} is scheduled after Period ${rowLunch}`}
                                    >
                                      P{rowLunch}
                                    </span>
                                  ) : (
                                    <div className="w-0.5 h-8 bg-amber-300 dark:bg-amber-700/60 rounded" />
                                  )}
                                </div>
                              </td>
                            ) : null;
                          }

                          // Determine column span for sessions starting in this period
                          const startingSessions = cellSessions.filter((s) => s.period_index === period.index);
                          const sessionSpan = startingSessions.length > 0
                            ? Math.max(1, ...startingSessions.map((s) => s.span || 1))
                            : 1;

                          const spansToDayEnd = pIdx + (sessionSpan - 1) >= periods.length - 1 && dayIdx < activeDays.length - 1;

                          // If selectedDemand is active, check feasibility for placement
                          const candidate = selectedDemand
                            ? checkPlacementCandidate(rowEntity.id, day, period.index)
                            : null;

                          return (
                            <React.Fragment key={`${cellKey}`}>
                              <td
                                colSpan={sessionSpan}
                                className={`p-1 ${
                                  spansToDayEnd || isDayEnd
                                    ? 'border-r-2 border-r-black dark:border-r-zinc-300'
                                    : isCustomSectionLunchBoundary
                                    ? 'border-r-4 border-r-amber-500 dark:border-r-amber-400'
                                    : 'border-r border-slate-100 dark:border-slate-800'
                                } relative transition align-top ${
                                densityStyles.cellMinHeight
                              } ${
                                candidate
                                  ? candidate.canPlace
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-400/60 cursor-pointer ring-1 ring-emerald-400/40'
                                    : 'bg-rose-500/5 hover:bg-rose-500/10 cursor-not-allowed opacity-60'
                                  : cellSessions.length === 0
                                    ? 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer group/cell'
                                    : ''
                              }`}
                              onClick={() => {
                                if (candidate?.canPlace) {
                                  onPlaceDemand(day, period.index, rowEntity.id);
                                } else if (!selectedDemand && cellSessions.length === 0) {
                                  onEmptyCellClick?.(day, period.index, rowEntity);
                                }
                              }}
                              title={
                                candidate
                                  ? candidate.canPlace
                                    ? `Click to place ${selectedDemand?.courseCode} here`
                                    : `Cannot place: ${candidate.reason}`
                                  : cellSessions.length === 0
                                    ? `Click to schedule class on ${day} Period ${period.index} for ${rowEntity.name}`
                                    : undefined
                              }
                            >
                              {/* Session Cards Rendering */}
                              {startingSessions.length > 0 ? (
                                <div className="flex flex-col gap-1 h-full">
                                  {startingSessions.map((session) => {
                                    const isLab = isLabSession(session);
                                    const theme = getCourseTheme(session.course_code, isLab);
                                    const isMultiBatch = session.batch && session.batch !== 'ALL';

                                    return (
                                      <div
                                        key={session.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditSession(session);
                                        }}
                                        className={`rounded-md p-1.5 shadow-2xs border transition relative group/card flex flex-col justify-between cursor-pointer ${
                                          densityStyles.fontSize
                                        }`}
                                        style={{
                                          backgroundColor: theme.bg,
                                          color: theme.text,
                                          borderColor: theme.border,
                                        }}
                                      >
                                        {/* Card Header: Code + Pin + Batch */}
                                        <div className="flex items-center justify-between gap-1 leading-tight">
                                          <span className="font-bold tracking-tight truncate">
                                            {session.course_code}
                                          </span>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {isMultiBatch && (
                                              <span className="bg-indigo-600 text-white rounded px-1 py-0.2 text-[9px] font-bold">
                                                {session.batch}
                                              </span>
                                            )}
                                            {Boolean(session.is_pinned) && (
                                              <Pin className="w-2.5 h-2.5 text-amber-600 fill-current" />
                                            )}
                                          </div>
                                        </div>

                                        {/* Middle Info: Faculty abbreviation & Room */}
                                        <div className="text-[10px] opacity-90 truncate mt-0.5 flex items-center justify-between">
                                          <span className="truncate">
                                            {perspective === 'FACULTY'
                                              ? session.section_name
                                              : session.faculty_name?.split(' ').pop() || session.faculty_code}
                                          </span>
                                          <span className="font-semibold ml-1 shrink-0">
                                            {session.room_code}
                                          </span>
                                        </div>

                                        {/* Lab Span Badge */}
                                        {isLab && (
                                          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold opacity-80">
                                            <FlaskConical className="w-2.5 h-2.5" />
                                            <span>{session.span}h Lab</span>
                                          </div>
                                        )}

                                        {/* Hover Overlay Controls (Pin, Edit, Delete) */}
                                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xs rounded-md opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center gap-1.5 p-1 z-10">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onTogglePinSession(session);
                                            }}
                                            className="p-1 rounded bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
                                            title={session.is_pinned ? 'Unpin' : 'Pin Session'}
                                          >
                                            <Pin
                                              className={`w-3 h-3 ${session.is_pinned ? 'fill-current text-amber-400' : ''}`}
                                            />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onEditSession(session);
                                            }}
                                            className="p-1 rounded bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
                                            title="Edit Session"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteSession(session.id);
                                            }}
                                            className="p-1 rounded bg-rose-500/80 hover:bg-rose-600 text-white transition cursor-pointer"
                                            title="Delete Session"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : candidate?.canPlace ? (
                                /* Valid placement target indicator */
                                <div className="h-full w-full rounded border-2 border-dashed border-emerald-400 flex items-center justify-center text-emerald-600 font-bold text-[10px] animate-pulse">
                                  + Place
                                </div>
                              ) : !selectedDemand && cellSessions.length === 0 ? (
                                <div className="h-full w-full min-h-[30px] rounded border border-transparent group-hover/cell:border-dashed group-hover/cell:border-slate-300 dark:group-hover/cell:border-slate-700 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition text-slate-400 dark:text-slate-500 font-bold text-xs select-none">
                                  +
                                </div>
                              ) : null}
                            </td>

                            {/* Lunch Recess Column Divider */}
                            {isAfterLunch && (
                              <td
                                className={`${
                                  hasCustomLunch
                                    ? 'bg-slate-100/50 dark:bg-slate-800/40 border-r border-dashed border-slate-300 dark:border-slate-700'
                                    : 'bg-amber-100/40 dark:bg-amber-950/20 border-r-2 border-amber-300/60 dark:border-amber-800'
                                } text-center p-0.5 select-none w-9 min-w-[36px]`}
                              >
                                <div className="h-full flex items-center justify-center">
                                  {hasCustomLunch ? (
                                    <span
                                      className="text-[8px] font-bold text-amber-600 dark:text-amber-400 leading-tight px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300/50"
                                      title={`Recess for ${rowEntity.name} is scheduled after Period ${rowLunch}`}
                                    >
                                      P{rowLunch}
                                    </span>
                                  ) : (
                                    <div className="w-0.5 h-8 bg-amber-300 dark:bg-amber-700/60 rounded" />
                                  )}
                                </div>
                              </td>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
