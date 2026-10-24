export interface ClassSession {
  id: string;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  period_index: number;
  span: number;
  section_name: string;
  is_pinned: boolean | number;
  course_id: string;
  course_code: string;
  course_name: string;
  faculty_id: string;
  faculty_code: string;
  faculty_name: string;
  room_id: string;
  room_code: string;
  room_name: string;
  room_type: string;
  department_code: string;
  mergedIds?: string[];
}

export interface FilterOption {
  id: string;
  name: string;
  code?: string;
  type?: string;
  capacity?: number;
  department_id?: string;
}

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  department_name?: string;
  department_code?: string;
  span?: number;
}

export interface PeriodSlot {
  index: number;
  time: string;
  label: string;
}

export interface TimetableTimingConfig {
  preset: 'NITP_OFFICIAL' | 'STANDARD_8' | 'CUSTOM';
  periods: PeriodSlot[];
  hasLunchBreak: boolean;
  lunchAfterPeriod: number;
  lunchTime: string;
  lunchLabel: string;
}

export const NITP_OFFICIAL_PERIODS: PeriodSlot[] = [
  { index: 1, time: '8:30 - 9:25', label: '1' },
  { index: 2, time: '9:30 - 10:25', label: '2' },
  { index: 3, time: '10:30 - 11:25', label: '3' },
  { index: 4, time: '11:30 - 12:25', label: '4' },
  { index: 5, time: '13:30 - 14:25', label: '5' },
  { index: 6, time: '14:30 - 15:25', label: '6' },
  { index: 7, time: '15:30 - 16:25', label: '7' },
  { index: 8, time: '16:30 - 17:25', label: '8' },
];

export const STANDARD_8_PERIODS: PeriodSlot[] = [
  { index: 1, time: '09:00 - 10:00', label: '1' },
  { index: 2, time: '10:00 - 11:00', label: '2' },
  { index: 3, time: '11:00 - 12:00', label: '3' },
  { index: 4, time: '12:00 - 13:00', label: '4' },
  { index: 5, time: '14:00 - 15:00', label: '5' },
  { index: 6, time: '15:00 - 16:00', label: '6' },
  { index: 7, time: '16:00 - 17:00', label: '7' },
  { index: 8, time: '17:00 - 18:00', label: '8' },
];

export const DEFAULT_TIMING_CONFIG: TimetableTimingConfig = {
  preset: 'NITP_OFFICIAL',
  periods: NITP_OFFICIAL_PERIODS,
  hasLunchBreak: true,
  lunchAfterPeriod: 4,
  lunchTime: '12:25 - 13:30',
  lunchLabel: 'LUNCH RECESS',
};

export const DAYS: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY')[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
};

export interface CourseTheme {
  border: string;
  bg: string;
  text: string;
  badge: string;
  codeColor: string;
  indicator: string;
  dotColor: string;
}

export const COURSE_COLOR_PALETTES: CourseTheme[] = [
  // 0. Sapphire / Indigo
  {
    border: 'border-indigo-200/90 hover:border-indigo-400',
    bg: 'bg-gradient-to-br from-indigo-50/95 to-blue-50/70',
    text: 'text-indigo-950',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    codeColor: 'text-indigo-900',
    indicator: 'bg-indigo-600',
    dotColor: 'bg-indigo-500',
  },
  // 1. Emerald / Teal
  {
    border: 'border-emerald-200/90 hover:border-emerald-400',
    bg: 'bg-gradient-to-br from-emerald-50/95 to-teal-50/70',
    text: 'text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    codeColor: 'text-emerald-900',
    indicator: 'bg-emerald-600',
    dotColor: 'bg-emerald-500',
  },
  // 2. Amber / Bronze
  {
    border: 'border-amber-200/90 hover:border-amber-400',
    bg: 'bg-gradient-to-br from-amber-50/95 to-orange-50/70',
    text: 'text-amber-950',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    codeColor: 'text-amber-900',
    indicator: 'bg-amber-600',
    dotColor: 'bg-amber-500',
  },
  // 3. Violet / Amethyst
  {
    border: 'border-violet-200/90 hover:border-violet-400',
    bg: 'bg-gradient-to-br from-violet-50/95 to-purple-50/70',
    text: 'text-violet-950',
    badge: 'bg-violet-100 text-violet-900 border-violet-200',
    codeColor: 'text-violet-900',
    indicator: 'bg-violet-600',
    dotColor: 'bg-violet-500',
  },
  // 4. Sky / Cyan
  {
    border: 'border-sky-200/90 hover:border-sky-400',
    bg: 'bg-gradient-to-br from-sky-50/95 to-cyan-50/70',
    text: 'text-sky-950',
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
    codeColor: 'text-sky-900',
    indicator: 'bg-sky-600',
    dotColor: 'bg-sky-500',
  },
  // 5. Rose / Crimson
  {
    border: 'border-rose-200/90 hover:border-rose-400',
    bg: 'bg-gradient-to-br from-rose-50/95 to-pink-50/70',
    text: 'text-rose-950',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    codeColor: 'text-rose-900',
    indicator: 'bg-rose-600',
    dotColor: 'bg-rose-500',
  },
];

export const LAB_THEME: CourseTheme = {
  border: 'border-teal-300 hover:border-teal-500 ring-1 ring-teal-200/70',
  bg: 'bg-gradient-to-br from-teal-50/95 via-cyan-50/80 to-sky-50/60',
  text: 'text-teal-950',
  badge: 'bg-teal-100 text-teal-950 border-teal-300 font-bold',
  codeColor: 'text-teal-900',
  indicator: 'bg-teal-600',
  dotColor: 'bg-teal-500',
};

export function getCourseTheme(courseCode: string, isLab: boolean): CourseTheme {
  if (isLab) return LAB_THEME;
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLOR_PALETTES.length;
  return COURSE_COLOR_PALETTES[index];
}

export function isLabSession(session: {
  room_type?: string;
  course_code?: string;
  course_name?: string;
}): boolean {
  const rt = session.room_type?.toUpperCase() || '';
  if (rt === 'LAB' || rt === 'COMPUTER_LAB') return true;
  const code = session.course_code?.toUpperCase() || '';
  if (code.endsWith('L') || code.includes('LAB')) return true;
  const name = session.course_name?.toLowerCase() || '';
  if (name.includes('lab') || name.includes('laboratory') || name.includes('practical')) return true;
  return false;
}

export function mergeAdjacentSessions(
  rawSessions: ClassSession[],
  lunchAfterPeriod = -1
): ClassSession[] {
  if (!rawSessions || rawSessions.length === 0) return [];

  // Group by day + section_name to guarantee proper grouping
  const groups = new Map<string, ClassSession[]>();
  for (const s of rawSessions) {
    const key = `${s.day}::${s.section_name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ ...s });
  }

  const result: ClassSession[] = [];

  for (const group of groups.values()) {
    // Sort chronologically by period_index
    group.sort((a, b) => a.period_index - b.period_index);

    const mergedGroup: ClassSession[] = [];

    for (const session of group) {
      if (mergedGroup.length === 0) {
        mergedGroup.push({
          ...session,
          mergedIds: session.mergedIds ? [...session.mergedIds] : [session.id],
        });
        continue;
      }

      const prev = mergedGroup[mergedGroup.length - 1];

      const isSameCourse =
        (prev.course_id && session.course_id && prev.course_id === session.course_id) ||
        (prev.course_code && session.course_code && prev.course_code === session.course_code);
      const isSameFaculty =
        prev.faculty_id === session.faculty_id ||
        (prev.faculty_name && session.faculty_name && prev.faculty_name === session.faculty_name);
      const isSameRoom =
        prev.room_id === session.room_id ||
        (prev.room_code && session.room_code && prev.room_code === session.room_code);
      const isContiguous = prev.period_index + prev.span === session.period_index;

      // Cannot cross lunch recess
      let crossesLunch = false;
      if (lunchAfterPeriod > 0) {
        const prevEndsAt = prev.period_index + prev.span - 1;
        if (prevEndsAt <= lunchAfterPeriod && session.period_index > lunchAfterPeriod) {
          crossesLunch = true;
        }
      }

      if (isSameCourse && isSameFaculty && isSameRoom && isContiguous && !crossesLunch) {
        // Merge session into prev
        prev.span += session.span;
        prev.is_pinned = Boolean(prev.is_pinned) || Boolean(session.is_pinned);
        if (!prev.mergedIds) {
          prev.mergedIds = [prev.id];
        }
        if (session.mergedIds && session.mergedIds.length > 0) {
          prev.mergedIds.push(...session.mergedIds);
        } else {
          prev.mergedIds.push(session.id);
        }
      } else {
        mergedGroup.push({
          ...session,
          mergedIds: session.mergedIds ? [...session.mergedIds] : [session.id],
        });
      }
    }

    result.push(...mergedGroup);
  }

  return result;
}
