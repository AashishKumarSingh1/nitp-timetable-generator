'use client';

import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Bot,
  Factory,
  Hand,
  Sliders,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: {
    complexity: 'normal' | 'large' | 'huge';
    strictness: 'draft' | 'relaxed' | 'strict';
    scope: 'all' | 'unplaced';
    clearUnpinned: boolean;
    workingDays: 5 | 6;
  }) => Promise<void>;
  onTest: () => Promise<void>;
  workingDays: 5 | 6;
  isGenerating?: boolean;
}

export function GeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  onTest,
  workingDays,
  isGenerating = false,
}: GeneratorModalProps) {
  const [complexity, setComplexity] = useState<'normal' | 'large' | 'huge'>('normal');
  const [strictness, setStrictness] = useState<'draft' | 'relaxed' | 'strict'>('strict');
  const [scope, setScope] = useState<'all' | 'unplaced'>('all');
  const [clearUnpinned, setClearUnpinned] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestClick = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      await onTest();
      setTestResult('Feasibility Check Passed: No room or teacher bottlenecks detected. Ready for generation.');
    } catch (err: any) {
      setTestResult(`Warning: ${err.message || 'Capacity warnings detected.'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunGenerate = async () => {
    await onGenerate({
      complexity,
      strictness,
      scope,
      clearUnpinned,
      workingDays,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate the Timetable">
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Pre-flight Test Action Button */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Pre-Flight Test</div>
            <div className="text-slate-500 text-[11px]">
              Verify mathematical demand vs available hall/faculty capacity before starting.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestClick}
            disabled={isTesting || isGenerating}
            className="flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
            <span>Test the Timetable</span>
          </Button>
        </div>

        {testResult && (
          <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Big Generate Action Button */}
        <button
          type="button"
          onClick={handleRunGenerate}
          disabled={isGenerating}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Solving Constraints & Allocating...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Generate Timetable</span>
            </>
          )}
        </button>

        {/* Complexity & Strictness Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Complexity of generation */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Complexity of Generation</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setComplexity('normal')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  complexity === 'normal'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs">Normal</span>
              </button>

              <button
                type="button"
                onClick={() => setComplexity('large')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  complexity === 'large'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <span className="text-xs">Large</span>
              </button>

              <button
                type="button"
                onClick={() => setComplexity('huge')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  complexity === 'huge'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Factory className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs">Huge</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              {complexity === 'normal' && 'Fast heuristic search, optimal for initial draft & quick tests.'}
              {complexity === 'large' && 'Deep backtracking solver with teacher gap minimization.'}
              {complexity === 'huge' && 'Exhaustive optimization for highly constrained engineering semesters.'}
            </div>
          </div>

          {/* Conditions / Strictness */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Conditions</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStrictness('draft')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  strictness === 'draft'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span className="text-xs">Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setStrictness('relaxed')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  strictness === 'relaxed'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs">Relaxed</span>
              </button>

              <button
                type="button"
                onClick={() => setStrictness('strict')}
                className={`p-2.5 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  strictness === 'strict'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Hand className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span className="text-xs">Strict</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              {strictness === 'draft' && 'Places demands quickly ignoring teacher gaps and conditional time-off.'}
              {strictness === 'relaxed' && 'Soft penalty on time-off (❓) slots; zero hard room/teacher collisions.'}
              {strictness === 'strict' && '100% collision-free; strictly enforces time-off and lunch barriers.'}
            </div>
          </div>
        </div>

        {/* Scope and Options */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Scope of Generation:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="all">Whole timetable (All cohorts & faculty)</option>
              <option value="unplaced">Unplaced lessons only (Keep existing)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={clearUnpinned}
              onChange={(e) => setClearUnpinned(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Clear unpinned sessions before regenerating (Keep 📌 pinned sessions)</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
