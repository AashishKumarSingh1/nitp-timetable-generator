'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  type TimetableTimingConfig,
  DEFAULT_TIMING_CONFIG,
  NITP_OFFICIAL_PERIODS,
  STANDARD_8_PERIODS,
} from '@/app/schedule/types';

interface TimingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (cfg: TimetableTimingConfig) => void;
}

export function TimingSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: TimingSettingsModalProps) {
  const { toast } = useToast();
  const [timingConfig, setTimingConfig] = useState<TimetableTimingConfig>(DEFAULT_TIMING_CONFIG);
  const [tempTimingConfig, setTempTimingConfig] = useState<TimetableTimingConfig>(DEFAULT_TIMING_CONFIG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nitp_timetable_timing_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.periods && parsed.periods.length > 0) {
          setTimingConfig(parsed);
          setTempTimingConfig(parsed);
        }
      }
    } catch {
      // default
    }
  }, [isOpen]);

  const handleSave = () => {
    setTimingConfig(tempTimingConfig);
    try {
      localStorage.setItem('nitp_timetable_timing_config', JSON.stringify(tempTimingConfig));
    } catch {
      // silent
    }
    toast.success('Institution timing & lunch schedule saved!');
    onSaved?.(tempTimingConfig);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Institution Timing & Lunch Schedule Settings"
      description="Define institute period start times, duration, and lunch recess position"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Preset Buttons */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-2">
            Timing Presets:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTempTimingConfig({
                  preset: 'NITP_OFFICIAL',
                  periods: NITP_OFFICIAL_PERIODS,
                  hasLunchBreak: true,
                  lunchAfterPeriod: 4,
                  lunchTime: '12:25 - 13:30',
                  lunchLabel: 'LUNCH RECESS',
                });
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                tempTimingConfig.preset === 'NITP_OFFICIAL'
                  ? 'border-red-700 bg-red-50/70 text-red-950 font-semibold ring-1 ring-red-700'
                  : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">NIT Patna Official (8 Periods)</span>
                {tempTimingConfig.preset === 'NITP_OFFICIAL' && (
                  <Check className="w-3.5 h-3.5 text-red-700" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                8:30 - 17:25 (55 min slots) · Lunch recess after Period 4 (12:25 - 13:30)
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setTempTimingConfig({
                  preset: 'STANDARD_8',
                  periods: STANDARD_8_PERIODS,
                  hasLunchBreak: true,
                  lunchAfterPeriod: 4,
                  lunchTime: '13:00 - 14:00',
                  lunchLabel: 'LUNCH BREAK',
                });
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                tempTimingConfig.preset === 'STANDARD_8'
                  ? 'border-red-700 bg-red-50/70 text-red-950 font-semibold ring-1 ring-red-700'
                  : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Standard University (8 Periods)</span>
                {tempTimingConfig.preset === 'STANDARD_8' && (
                  <Check className="w-3.5 h-3.5 text-red-700" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                9:00 - 18:00 (60 min slots) · Lunch after Period 4
              </p>
            </button>
          </div>
        </div>

        {/* Lunch Recess Controls */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 block">
                Lunch Recess Definition
              </span>
              <span className="text-[11px] text-zinc-500">
                Controls where lunch break is placed and ensures multi-period labs do not cross it
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tempTimingConfig.hasLunchBreak}
                onChange={(e) =>
                  setTempTimingConfig({
                    ...tempTimingConfig,
                    preset: 'CUSTOM',
                    hasLunchBreak: e.target.checked,
                  })
                }
                className="rounded border-zinc-300 text-red-700 focus:ring-red-600 h-4 w-4"
              />
              <span className="text-xs font-bold text-zinc-800">Enable Lunch Break</span>
            </label>
          </div>

          {tempTimingConfig.hasLunchBreak && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
              <Select
                label="When Lunch Break Occurs"
                value={tempTimingConfig.lunchAfterPeriod}
                onChange={(e) =>
                  setTempTimingConfig({
                    ...tempTimingConfig,
                    preset: 'CUSTOM',
                    lunchAfterPeriod: Number(e.target.value),
                  })
                }
              >
                {tempTimingConfig.periods.map((p) => (
                  <option key={p.index} value={p.index}>
                    After Period {p.index} (around {p.time.split('-')[1]?.trim()})
                  </option>
                ))}
              </Select>

              <Input
                label="Lunch Time Label (e.g. 12:30 - 13:25)"
                value={tempTimingConfig.lunchTime}
                onChange={(e) =>
                  setTempTimingConfig({
                    ...tempTimingConfig,
                    preset: 'CUSTOM',
                    lunchTime: e.target.value,
                  })
                }
                placeholder="e.g. 12:30 - 13:25"
              />
            </div>
          )}
        </div>

        {/* Period Slots Editor Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Period Slots ({tempTimingConfig.periods.length} Periods)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const nextIdx = tempTimingConfig.periods.length + 1;
                  setTempTimingConfig({
                    ...tempTimingConfig,
                    preset: 'CUSTOM',
                    periods: [
                      ...tempTimingConfig.periods,
                      { index: nextIdx, time: '17:30 - 18:25', label: String(nextIdx) },
                    ],
                  });
                }}
                className="text-xs py-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Period
              </Button>
              {tempTimingConfig.periods.length > 5 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const updated = tempTimingConfig.periods.slice(0, -1);
                    setTempTimingConfig({
                      ...tempTimingConfig,
                      preset: 'CUSTOM',
                      periods: updated,
                      lunchAfterPeriod: Math.min(
                        tempTimingConfig.lunchAfterPeriod,
                        updated.length - 1
                      ),
                    });
                  }}
                  className="text-xs py-1 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Last
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-200">
            {tempTimingConfig.periods.map((p, idx) => (
              <div
                key={p.index}
                className="p-2.5 flex items-center gap-3 bg-white hover:bg-zinc-50/80 text-xs"
              >
                <span className="w-16 font-bold text-zinc-900 font-mono text-center px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
                  Period {p.index}
                </span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={p.time}
                    onChange={(e) => {
                      const nextPeriods = [...tempTimingConfig.periods];
                      nextPeriods[idx].time = e.target.value;
                      setTempTimingConfig({
                        ...tempTimingConfig,
                        preset: 'CUSTOM',
                        periods: nextPeriods,
                      });
                    }}
                    className="w-full px-2.5 py-1 text-xs border border-zinc-200 rounded-lg font-mono focus:border-red-600 focus:outline-none"
                    placeholder="e.g. 8:30 - 9:25"
                  />
                </div>
                {tempTimingConfig.hasLunchBreak && tempTimingConfig.lunchAfterPeriod === p.index && (
                  <Badge variant="crimson" size="sm">
                    Lunch Follows
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTempTimingConfig(DEFAULT_TIMING_CONFIG);
            }}
          >
            Reset to NIT Patna Defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              Save Schedule Settings
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
