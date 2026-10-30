'use client';

import React from 'react';
import {
  CalendarDays,
  Play,
  CheckCircle2,
  Printer,
  ZoomIn,
  RefreshCw,
  Search,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { StudioPerspective, GridDensity } from '../types';

interface TimetableRibbonProps {
  perspective: StudioPerspective;
  onPerspectiveChange: (p: StudioPerspective) => void;
  density: GridDensity;
  onDensityChange: (d: GridDensity) => void;
  onTestTimetable: () => void;
  onOpenGenerateModal: () => void;
  onOpenVerificationModal: () => void;
  onPrintPreview: () => void;
  onRefresh: () => void;
  isGenerating?: boolean;
  activeViewMode: 'STUDIO' | 'SINGLE';
  onToggleViewMode: (mode: 'STUDIO' | 'SINGLE') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function TimetableRibbon({
  perspective,
  onPerspectiveChange,
  density,
  onDensityChange,
  onTestTimetable,
  onOpenGenerateModal,
  onOpenVerificationModal,
  onPrintPreview,
  onRefresh,
  isGenerating,
  activeViewMode,
  onToggleViewMode,
  searchQuery,
  onSearchChange,
}: TimetableRibbonProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden mb-4">
      {/* Top Bar: View Mode & Search */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 gap-3">
        <div className="flex items-center gap-3">
          {/* Studio vs Single Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => onToggleViewMode('STUDIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeViewMode === 'STUDIO'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>aPn Studio Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('SINGLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeViewMode === 'SINGLE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Single Cohort View</span>
            </button>
          </div>

          {/* Perspective selector for Studio Grid */}
          {activeViewMode === 'STUDIO' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-lg text-xs">
              <span className="text-slate-500 font-medium">Rows:</span>
              <button
                type="button"
                onClick={() => onPerspectiveChange('SECTIONS')}
                className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                  perspective === 'SECTIONS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Classes / Sections
              </button>
              <button
                type="button"
                onClick={() => onPerspectiveChange('FACULTY')}
                className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                  perspective === 'FACULTY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Teachers
              </button>
              <button
                type="button"
                onClick={() => onPerspectiveChange('ROOMS')}
                className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                  perspective === 'ROOMS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Classrooms
              </button>
            </div>
          )}
        </div>

        {/* Search & Zoom Density */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects, faculty, rooms..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-52 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {activeViewMode === 'STUDIO' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-1 rounded-lg text-xs">
              <ZoomIn className="w-3 h-3 text-slate-500" />
              <button
                type="button"
                onClick={() => onDensityChange('compact')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  density === 'compact' ? 'bg-white dark:bg-slate-900 font-bold shadow-xs' : 'text-slate-500'
                }`}
                title="Compact Density"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => onDensityChange('normal')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  density === 'normal' ? 'bg-white dark:bg-slate-900 font-bold shadow-xs' : 'text-slate-500'
                }`}
                title="Normal Density"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => onDensityChange('comfortable')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  density === 'comfortable' ? 'bg-white dark:bg-slate-900 font-bold shadow-xs' : 'text-slate-500'
                }`}
                title="Expanded Density"
              >
                L
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Reload Timetable"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timetable Engine Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 overflow-x-auto text-xs bg-slate-50/40 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">

        {/* Test the Timetable */}
        <button
          type="button"
          onClick={onTestTimetable}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
          title="Run quick pre-flight test check"
        >
          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Test</span>
        </button>

        {/* Generate Button (Hero action) */}
        <button
          type="button"
          onClick={onOpenGenerateModal}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>Generate</span>
        </button>

        {/* Conflict Checker */}
        <button
          type="button"
          onClick={onOpenVerificationModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
          title="Inspect timetable for room collisions, faculty clashes, and schedule issues"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Check Conflicts</span>
        </button>

        {/* Print preview */}
        <button
          type="button"
          onClick={onPrintPreview}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium ml-auto"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Preview</span>
        </button>
      </div>
    </div>
  );
}
