export interface ClassSession {
  id: string;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  period_index: number;
  span: number;
  section_name: string;
  batch?: string; // 'ALL', 'Batch 1', 'Batch 2'
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

export type StudioPerspective = 'SECTIONS' | 'FACULTY' | 'ROOMS';
export type GridDensity = 'compact' | 'normal' | 'comfortable';

export interface UnplacedDemand {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  sectionName: string;
  batch?: string;
  span: number;
  periodsPerWeek: number;
  reason?: string;
  lessonFormat?: LessonFormat;
  lesson_format?: LessonFormat;
}

export interface FilterOption {
  id: string;
  name: string;
  code?: string;
  type?: string;
  capacity?: number;
  department_id?: string;
  time_off?: string | null;
  color?: string | null;
  designation?: string;
  email?: string;
  max_daily_periods?: number;
  max_weekly_periods?: number;
}

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  department_name?: string;
  department_code?: string;
  span?: number;
  periods_per_week?: number;
  lesson_format?: LessonFormat;
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

export function getCourseTheme(courseCode: string, isLab = false): CourseTheme {
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

export function isSameSection(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = a.trim();
  const cleanB = b.trim();
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

  // Department prefix is strictly separated by space-hyphen-space: e.g. "CSE - Section A"
  const matchA = cleanA.match(/^([a-z0-9_]+)\s+-\s+(.+)$/i);
  const matchB = cleanB.match(/^([a-z0-9_]+)\s+-\s+(.+)$/i);

  if (matchA && matchB) {
    // Both have department prefixes: both department code and section name must match
    const deptA = matchA[1].toLowerCase();
    const deptB = matchB[1].toLowerCase();
    const secA = matchA[2].trim().toLowerCase();
    const secB = matchB[2].trim().toLowerCase();
    return deptA === deptB && secA === secB;
  }

  if (matchA && !matchB) {
    // Only A has department prefix (e.g. A="EE - Section B", B="Section B")
    const secA = matchA[2].trim().toLowerCase();
    const secB = cleanB.toLowerCase();
    return secA === secB;
  }

  if (!matchA && matchB) {
    // Only B has department prefix (e.g. A="Section B", B="EE - Section B")
    const secA = cleanA.toLowerCase();
    const secB = matchB[2].trim().toLowerCase();
    return secA === secB;
  }

  return cleanA.toLowerCase() === cleanB.toLowerCase();
}

export type LessonFormat =
  | '1_AT_A_TIME'
  | '1_AND_2_MIX'
  | '2_AT_A_TIME'
  | '3_AT_A_TIME'
  | 'DEFAULT';

export const LESSON_FORMAT_LABELS: Record<LessonFormat, string> = {
  '1_AT_A_TIME': '1 hour at a time (e.g. 1 + 1 + 1)',
  '1_AND_2_MIX': '1 and 2 mix (e.g. 2 + 1 double & single)',
  '2_AT_A_TIME': '2 hours at a time (e.g. 2 + 2 double blocks)',
  '3_AT_A_TIME': '3 hours at a time (e.g. 3-hour workshop/lab)',
  'DEFAULT': 'Default (Follow Subject Setting)',
};

export function calculateSessionSpans(
  periodsPerWeek: number,
  format?: LessonFormat | string | null,
  defaultSpan = 1
): number[] {
  const periods = Math.max(1, Number(periodsPerWeek) || 1);
  const fmt = ((format as LessonFormat) || '1_AT_A_TIME').toUpperCase();

  if (fmt === '1_AND_2_MIX') {
    if (periods <= 1) return [1];
    if (periods === 2) return [2];
    if (periods === 3) return [2, 1];
    if (periods === 4) return [2, 1, 1];
    if (periods === 5) return [2, 2, 1];
    if (periods === 6) return [2, 2, 1, 1];

    const spans: number[] = [];
    let rem = periods;
    while (rem > 2) {
      spans.push(2);
      rem -= 2;
    }
    if (rem === 2) spans.push(2);
    else if (rem === 1) spans.push(1);
    return spans;
  }

  if (fmt === '2_AT_A_TIME') {
    const spans: number[] = [];
    let rem = periods;
    while (rem >= 2) {
      spans.push(2);
      rem -= 2;
    }
    if (rem > 0) spans.push(rem);
    return spans;
  }

  if (fmt === '3_AT_A_TIME') {
    const spans: number[] = [];
    let rem = periods;
    while (rem >= 3) {
      spans.push(3);
      rem -= 3;
    }
    if (rem > 0) spans.push(rem);
    return spans;
  }

  if (fmt === 'DEFAULT' && defaultSpan > 1) {
    const spans: number[] = [];
    let rem = periods;
    while (rem >= defaultSpan) {
      spans.push(defaultSpan);
      rem -= defaultSpan;
    }
    if (rem > 0) spans.push(rem);
    return spans;
  }

  return Array(periods).fill(1);
}

