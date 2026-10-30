'use client';

import React from 'react';
import { Layers, Plus, Clock, User, DoorOpen, X, Sparkles, Check } from 'lucide-react';
import { UnplacedDemand, getCourseTheme } from '../types';

interface UnplacedLessonsTrayProps {
  unplacedDemands: UnplacedDemand[];
  selectedDemand: UnplacedDemand | null;
  onSelectDemand: (demand: UnplacedDemand | null) => void;
  onAutoPlaceAll?: () => void;
  isGenerating?: boolean;
}

export function UnplacedLessonsTray({
  unplacedDemands,
  selectedDemand,
  onSelectDemand,
  onAutoPlaceAll,
  isGenerating,
}: UnplacedLessonsTrayProps) {
  if (unplacedDemands.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Holding Tray:</span>
          <span>All demands are currently placed on the master grid. (0 unplaced)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Unplaced Lessons Holding Tray ({unplacedDemands.length})
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click any lesson card below to enter Placement Mode, then click any empty grid slot.
          </span>
        </div>

        {selectedDemand && (
          <button
            type="button"
            onClick={() => onSelectDemand(null)}
            className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Cancel Placement Mode
          </button>
        )}
      </div>

      {/* Selected placement banner */}
      {selectedDemand && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Placing:</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              {selectedDemand.courseCode} - {selectedDemand.courseName}
            </span>
            <span>•</span>
            <span>{selectedDemand.sectionName}</span>
            {selectedDemand.batch && selectedDemand.batch !== 'ALL' && (
              <span className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {selectedDemand.batch}
              </span>
            )}
            <span>•</span>
            <span>{selectedDemand.facultyName}</span>
            <span>•</span>
            <span className="font-medium">{selectedDemand.span} hour(s)</span>
          </div>
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 animate-pulse">
            👉 Click an empty slot in the grid above to place
          </span>
        </div>
      )}

      {/* Horizontal Scrollable Rack of Unplaced Cards */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
        {unplacedDemands.map((demand) => {
          const isSelected = selectedDemand?.id === demand.id;
          const isLab = demand.span > 1;
          const theme = getCourseTheme(demand.courseCode, isLab);

          return (
            <div
              key={demand.id}
              onClick={() => onSelectDemand(isSelected ? null : demand)}
              className={`shrink-0 border rounded-lg p-2.5 transition cursor-pointer select-none min-w-[210px] max-w-[260px] text-xs shadow-xs relative ${
                isSelected
                  ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300'
                  : 'bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Badge row */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                  style={{ backgroundColor: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
                >
                  {demand.courseCode}
                </span>

                <div className="flex items-center gap-1">
                  {isLab && (
                    <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded text-[10px] font-bold">
                      {demand.span}h Lab
                    </span>
                  )}
                  {demand.batch && demand.batch !== 'ALL' && (
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded text-[10px] font-semibold">
                      {demand.batch}
                    </span>
                  )}
                </div>
              </div>

              {/* Course Title */}
              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate mb-1">
                {demand.courseName}
              </div>

              {/* Section & Faculty */}
              <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {demand.sectionName}
                </div>
                <div className="truncate flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{demand.facultyName}</span>
                </div>
              </div>

              {/* Placement CTA indicator */}
              <div className="mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Freq: {demand.periodsPerWeek}x/wk</span>
                <span className={`font-semibold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                  {isSelected ? 'Ready to place' : 'Click to place'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
