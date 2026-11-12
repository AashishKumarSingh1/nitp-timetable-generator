import { query, transaction } from './db';
import { calculateSessionSpans, type LessonFormat } from '@/app/schedule/types';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export const ALL_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export interface ScheduleDemand {
  sectionId?: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  sectionName: string;
  batch?: string;
  span: number; // 1 for theory, 2 for lab
  preferredRoomType?: string;
  periodsPerWeek: number;
}

export interface PlacedSession {
  id: string;
  day: DayOfWeek;
  periodIndex: number; // 1 to 8
  span: number;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  sectionName: string;
  batch?: string;
  isPinned: boolean;
}

export interface SolverResult {
  success: boolean;
  totalDemanded: number;
  placedCount: number;
  unplacedCount: number;
  unplacedDemands: { demand: ScheduleDemand; reason: string }[];
  durationMs: number;
  placementRate: number;
  singleHourDaysCount: number;
  isolatedGapsCount: number;
  contiguousBlocksCount: number;
  reliefDaysCount: number;
}

export async function runSchedulerSolver(options: {
  daysCount?: 5 | 6;
  clearUnpinned?: boolean;
  periodsCount?: number;
  lunchAfterPeriod?: number;
  complexity?: 'normal' | 'large' | 'huge';
  strictness?: 'draft' | 'relaxed' | 'strict';
}): Promise<SolverResult> {
  const startTime = Date.now();
  const daysCount = options.daysCount || 5;
  const periodsCount = Math.min(12, Math.max(6, options.periodsCount || 8));
  const lunchAfter = options.lunchAfterPeriod !== undefined ? options.lunchAfterPeriod : 4;
  const activeDays = ALL_DAYS.slice(0, daysCount);

  // 1. Fetch available rooms
  const rooms = await query<{
    id: string;
    code: string;
    name: string;
    type: string;
    capacity: number;
    is_available: number | boolean;
    department_id?: string | null;
    time_off?: string | null;
  }>('SELECT id, code, name, type, capacity, is_available, department_id, time_off FROM rooms WHERE is_available = 1 ORDER BY capacity DESC');

  if (rooms.length === 0) {
    throw new Error('No active rooms available in the database.');
  }

  const roomTimeOffMap = new Map<string, Record<string, number[]>>();
  for (const r of rooms) {
    if (r.time_off) {
      try {
        roomTimeOffMap.set(r.id, JSON.parse(r.time_off));
      } catch {
        // ignore
      }
    }
  }

  // 2. Fetch faculty and their limits
  const facultyList = await query<{
    id: string;
    code: string;
    name: string;
    max_daily_periods: number;
    max_weekly_periods: number;
    time_off?: string | null;
  }>('SELECT id, code, name, max_daily_periods, max_weekly_periods, time_off FROM faculty');

  const facultyCapMap = new Map<string, { daily: number; weekly: number }>();
  const facTimeOffMap = new Map<string, Record<string, number[]>>();
  for (const f of facultyList) {
    facultyCapMap.set(f.id, {
      daily: f.max_daily_periods,
      weekly: f.max_weekly_periods,
    });
    if (f.time_off) {
      try {
        facTimeOffMap.set(f.id, JSON.parse(f.time_off));
      } catch {
        // ignore
      }
    }
  }

  // 3. Fetch courses
  const courses = await query<{
    id: string;
    code: string;
    name: string;
    department_id: string;
    periods_per_week: number;
    span: number;
    lesson_format?: LessonFormat;
  }>('SELECT id, code, name, department_id, periods_per_week, span, lesson_format FROM courses');

  // Match courses to faculty by department
  const facultyByDept = await query<{ id: string; department_id: string; code: string; name: string }>(
    'SELECT id, department_id, code, name FROM faculty'
  );

  // 4. Fetch already pinned sessions to preserve
  const existingPinned = await query<{
    id: string;
    day: DayOfWeek;
    period_index: number;
    span: number;
    course_id: string;
    faculty_id: string;
    room_id: string;
    section_name: string;
    is_pinned: number | boolean;
  }>('SELECT id, day, period_index, span, course_id, faculty_id, room_id, section_name, is_pinned FROM class_sessions WHERE is_pinned = 1');

  // Tracking Bookings
  // Key formats:
  // Room: `room:${roomId}:${day}:${period}`
  // Faculty: `faculty:${facultyId}:${day}:${period}`
  // Section: `section:${sectionName}:${day}:${period}`
  const occupiedSlots = new Set<string>();

  // Faculty section slot map: `faculty:${facultyId}:${day}:${period}` -> sectionName
  const facultySectionSlotMap = new Map<string, string>();

  // Faculty periods count: `faculty:${facultyId}:${day}` and `faculty:${facultyId}:week`
  const facultyPeriodCounts = new Map<string, number>();

  // Period-level occupied tracking for instant contiguity & gap detection
  const sectionDayPeriods = new Map<string, Set<number>>(); // `${sectionName}:${day}` -> Set of periods
  const facultyDayPeriods = new Map<string, Set<number>>(); // `${facultyId}:${day}` -> Set of periods

  // Section lab tracking to avoid double-lab overload and spread multi-hour blocks
  const sectionLabDayCount = new Map<string, number>(); // `section:${sectionName}:${day}:labs`

  // Student section workload tracking:
  // 1. Total class/lab hours per day: `section:${sectionName}:${day}:total_hours` (Max 7 hours)
  // 2. Total theory teaching hours per day: `section:${sectionName}:${day}:teaching_hours` (Max 5 hours)
  const sectionDayTotalHours = new Map<string, number>();
  const sectionDayTeachingHours = new Map<string, number>();

  // Section & Course per day to spread evenly
  const courseDayCount = new Map<string, number>(); // `course:${courseId}:${day}`

  // Register pinned sessions
  for (const ps of existingPinned) {
    const secDayKey = `${ps.section_name}:${ps.day}`;
    if (!sectionDayPeriods.has(secDayKey)) sectionDayPeriods.set(secDayKey, new Set<number>());
    const facDayKey = `${ps.faculty_id}:${ps.day}`;
    if (!facultyDayPeriods.has(facDayKey)) facultyDayPeriods.set(facDayKey, new Set<number>());

    if (ps.span > 1) {
      const secLabKey = `section:${ps.section_name}:${ps.day}:labs`;
      sectionLabDayCount.set(secLabKey, (sectionLabDayCount.get(secLabKey) || 0) + 1);
    }

    for (let p = 0; p < ps.span; p++) {
      const pIdx = ps.period_index + p;
      occupiedSlots.add(`room:${ps.room_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`faculty:${ps.faculty_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`section:${ps.section_name}:${ps.day}:${pIdx}`);
      facultySectionSlotMap.set(`faculty:${ps.faculty_id}:${ps.day}:${pIdx}`, ps.section_name);
      sectionDayPeriods.get(secDayKey)!.add(pIdx);
      facultyDayPeriods.get(facDayKey)!.add(pIdx);

      // Count faculty periods
      const dayKey = `faculty:${ps.faculty_id}:${ps.day}`;
      const weekKey = `faculty:${ps.faculty_id}:week`;
      facultyPeriodCounts.set(dayKey, (facultyPeriodCounts.get(dayKey) || 0) + 1);
      facultyPeriodCounts.set(weekKey, (facultyPeriodCounts.get(weekKey) || 0) + 1);
    }

    // Register student section daily loads
    const secTotalKey = `section:${ps.section_name}:${ps.day}:total_hours`;
    const secTeachKey = `section:${ps.section_name}:${ps.day}:teaching_hours`;
    sectionDayTotalHours.set(secTotalKey, (sectionDayTotalHours.get(secTotalKey) || 0) + ps.span);
    if (ps.span === 1) {
      sectionDayTeachingHours.set(secTeachKey, (sectionDayTeachingHours.get(secTeachKey) || 0) + 1);
    }
  }

  // 5. Generate Demands from Sections, Courses & Teaching Allocations
  const demands: ScheduleDemand[] = [];

  // Fetch sections from database with department codes and time_off
  const dbSections = await query<{ id: string; name: string; department_id: string; semester: number; department_code?: string; time_off?: string | null }>(
    `SELECT s.id, s.name, s.department_id, s.semester, s.time_off, d.code as department_code
     FROM sections s
     LEFT JOIN departments d ON d.id = s.department_id
     ORDER BY d.code ASC, s.name ASC`
  );

  const secTimeOffMap = new Map<string, Record<string, number[]>>();
  for (const s of dbSections) {
    if (s.time_off) {
      try {
        secTimeOffMap.set(s.id, JSON.parse(s.time_off));
      } catch {
        // ignore
      }
    }
  }

  // Fetch all existing teaching assignments
  const teachingAssignments = await query<{
    section_id: string;
    course_id: string;
    faculty_id: string;
    periods_per_week: number;
    lesson_format?: string;
    course_code: string;
    course_name: string;
    course_span: number;
    course_lesson_format?: string;
    faculty_name: string;
    faculty_code: string;
  }>(`
    SELECT ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week, ta.lesson_format,
           c.code as course_code, c.name as course_name, c.span as course_span, c.lesson_format as course_lesson_format,
           f.name as faculty_name, f.code as faculty_code
    FROM teaching_assignments ta
    JOIN courses c ON c.id = ta.course_id
    JOIN faculty f ON f.id = ta.faculty_id
  `);

  // Map: `section_id:course_id` -> assignment
  const assignmentMap = new Map<string, typeof teachingAssignments[0]>();
  for (const ta of teachingAssignments) {
    assignmentMap.set(`${ta.section_id}:${ta.course_id}`, ta);
  }

  // Course Primary Instructor Map (Scenario 1: Professor X teaches Subject Code Y)
  const coursePrimaryInstructorMap = new Map<string, typeof teachingAssignments[0]>();
  for (const ta of teachingAssignments) {
    if (!coursePrimaryInstructorMap.has(ta.course_id)) {
      coursePrimaryInstructorMap.set(ta.course_id, ta);
    }
  }

  // Track assigned load per faculty across demands to balance allocations
  const facultyLoadTracker = new Map<string, number>();
  for (const f of facultyList) {
    facultyLoadTracker.set(f.id, 0);
  }

  // Pre-seed load from existing assignments
  for (const ta of teachingAssignments) {
    const cur = facultyLoadTracker.get(ta.faculty_id) || 0;
    facultyLoadTracker.set(ta.faculty_id, cur + (ta.periods_per_week || 3));
  }

  // Sections to schedule: Use DB sections if available, otherwise fallback to defaults
  const sectionsToSchedule = dbSections.length > 0
    ? dbSections
    : [
        { id: 'default_sec_a', name: 'Section A', department_id: courses[0]?.department_id || '', semester: 3, department_code: 'CSE' },
        { id: 'default_sec_b', name: 'Section B', department_id: courses[0]?.department_id || '', semester: 3, department_code: 'CSE' },
      ];

  for (const sec of sectionsToSchedule) {
    const deptCode = sec.department_code || '';
    const sectionDisplayName = (deptCode && !sec.name.toUpperCase().startsWith(deptCode.toUpperCase()))
      ? `${deptCode} - ${sec.name}`
      : sec.name;

    // Determine relevant courses: if this section has explicitly mapped courses, use them;
    // otherwise fallback to all courses belonging to section's department.
    const mappedCourseIds = new Set(
      teachingAssignments.filter((ta) => ta.section_id === sec.id).map((ta) => ta.course_id)
    );
    let secCourses = mappedCourseIds.size > 0
      ? courses.filter((c) => mappedCourseIds.has(c.id))
      : courses.filter((c) => c.department_id === sec.department_id);

    if (secCourses.length === 0) {
      continue; // No curriculum defined for this department/section yet
    }

    for (const c of secCourses) {
      const assignmentKey = `${sec.id}:${c.id}`;
      const explicitMapping = assignmentMap.get(assignmentKey);

      let facId: string;
      let facName: string;
      let facCode: string;
      let periods = c.periods_per_week;
      const span = c.span || 1;

      if (explicitMapping) {
        // Tier 1: Explicit Section Mapping
        facId = explicitMapping.faculty_id;
        facName = explicitMapping.faculty_name;
        facCode = explicitMapping.faculty_code;
        periods = explicitMapping.periods_per_week || c.periods_per_week;
      } else if (coursePrimaryInstructorMap.has(c.id)) {
        // Tier 2: Scenario 1 - Professor X teaches Subject Code Y for this course
        const primary = coursePrimaryInstructorMap.get(c.id)!;
        const curLoad = facultyLoadTracker.get(primary.faculty_id) || 0;
        const limits = facultyCapMap.get(primary.faculty_id) || { daily: 4, weekly: 18 };

        if (curLoad + periods <= limits.weekly) {
          facId = primary.faculty_id;
          facName = primary.faculty_name;
          facCode = primary.faculty_code;
          facultyLoadTracker.set(primary.faculty_id, curLoad + periods);
        } else {
          // Primary instructor at max capacity: fallback to department faculty with highest remaining bandwidth
          const deptFaculty = facultyByDept.filter((f) => f.department_id === c.department_id && f.id !== primary.faculty_id);
          const pool = deptFaculty.length > 0 ? deptFaculty : facultyByDept;
          pool.sort((a, b) => {
            const aLimits = facultyCapMap.get(a.id) || { daily: 4, weekly: 18 };
            const bLimits = facultyCapMap.get(b.id) || { daily: 4, weekly: 18 };
            const aLoad = facultyLoadTracker.get(a.id) || 0;
            const bLoad = facultyLoadTracker.get(b.id) || 0;
            return (bLimits.weekly - bLoad) - (aLimits.weekly - aLoad);
          });
          const suitableFac = pool[0] || primary;
          facId = suitableFac.id;
          facName = suitableFac.name;
          facCode = suitableFac.code;
          facultyLoadTracker.set(facId, (facultyLoadTracker.get(facId) || 0) + periods);
        }
      } else {
        // Tier 3: Find qualified faculty from course department, prioritizing remaining capacity within weekly limits
        const deptFaculty = facultyByDept.filter((f) => f.department_id === c.department_id);
        const pool = deptFaculty.length > 0 ? deptFaculty : facultyByDept;
        pool.sort((a, b) => {
          const aLimits = facultyCapMap.get(a.id) || { daily: 4, weekly: 18 };
          const bLimits = facultyCapMap.get(b.id) || { daily: 4, weekly: 18 };
          const aLoad = facultyLoadTracker.get(a.id) || 0;
          const bLoad = facultyLoadTracker.get(b.id) || 0;

          const aFits = aLoad + periods <= aLimits.weekly;
          const bFits = bLoad + periods <= bLimits.weekly;

          if (aFits && !bFits) return -1;
          if (!aFits && bFits) return 1;

          return (bLimits.weekly - bLoad) - (aLimits.weekly - aLoad);
        });

        const suitableFac = pool[0];
        if (!suitableFac) continue;

        facId = suitableFac.id;
        facName = suitableFac.name;
        facCode = suitableFac.code;
        facultyLoadTracker.set(facId, (facultyLoadTracker.get(facId) || 0) + periods);
      }

      const isCourseLab = c.code.endsWith('L') || c.code.endsWith('-PR') || c.code.includes('LAB') || c.name.toLowerCase().includes('lab') || c.name.toLowerCase().includes('practical');

      const effectiveFormat: LessonFormat = isCourseLab
        ? (periods === 3 ? '3_AT_A_TIME' : '2_AT_A_TIME')
        : (explicitMapping?.lesson_format && explicitMapping.lesson_format !== 'DEFAULT')
          ? (explicitMapping.lesson_format as LessonFormat)
          : ((c.lesson_format as LessonFormat) || (span > 1 ? (span === 3 ? '3_AT_A_TIME' : '2_AT_A_TIME') : '1_AT_A_TIME'));

      const sessionSpans = calculateSessionSpans(periods, effectiveFormat, isCourseLab ? 2 : span);
      for (const s of sessionSpans) {
        const isLabSlot = isCourseLab || s > 1;
        demands.push({
          sectionId: sec.id,
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          facultyId: facId,
          facultyName: facName,
          facultyCode: facCode,
          sectionName: sectionDisplayName,
          span: s,
          preferredRoomType: isLabSlot ? 'COMPUTER_LAB' : 'LECTURE_HALL',
          periodsPerWeek: periods,
        });
      }
    }
  }

  // Dedicated Section Home Classroom Allocation
  // Institutional Invariant: "If there is enough rooms, allot the same classroom for the same set of students"
  const sectionHomeRoomMap = new Map<string, string>(); // sectionDisplayName -> roomId
  const theoryRooms = rooms.filter(
    (r) => r.type === 'LECTURE_HALL' || r.type === 'CLASSROOM' || r.type === 'SEMINAR_HALL'
  );
  const assignedHomeRooms = new Set<string>();

  const isTheoryRoomAvailable = (roomId: string, day: string, period: number): boolean => {
    if (occupiedSlots.has(`room:${roomId}:${day}:${period}`)) return false;
    const rTO = roomTimeOffMap.get(roomId);
    if (rTO && rTO[day] && rTO[day][period - 1] === 0) return false;
    return true;
  };

  const getAvailableTheoryRoom = (day: string, period: number) => {
    return theoryRooms.find((r) => isTheoryRoomAvailable(r.id, day, period));
  };

  for (const sec of sectionsToSchedule) {
    const deptCode = sec.department_code || '';
    const sectionDisplayName = (deptCode && !sec.name.toUpperCase().startsWith(deptCode.toUpperCase()))
      ? `${deptCode} - ${sec.name}`
      : sec.name;

    // Filter available classrooms not yet assigned as primary home room to another section
    let candidates = theoryRooms.filter((r) => !assignedHomeRooms.has(r.id));
    if (candidates.length === 0) {
      candidates = theoryRooms;
    }

    // Prioritize room belonging to section's department
    const deptMatch = candidates.find((r) => r.department_id === sec.department_id);
    const chosenRoom = deptMatch || candidates[0] || theoryRooms[0];
    if (chosenRoom) {
      sectionHomeRoomMap.set(sectionDisplayName, chosenRoom.id);
      assignedHomeRooms.add(chosenRoom.id);
    }
  }

  // Heuristic sort: multi-span labs first (most constrained), then group by sectionName so curriculum demands form continuous blocks
  demands.sort((a, b) => (b.span - a.span) || a.sectionName.localeCompare(b.sectionName) || (b.periodsPerWeek - a.periodsPerWeek));

  const placedSessions: PlacedSession[] = [];
  const unplacedDemands: { demand: ScheduleDemand; reason: string }[] = [];

  // Flexible Periods: 1..periodsCount with user-defined lunch boundary (if lunchAfter > 0)
  // A session of span N must fit fully before lunch or after lunch. It CANNOT cross lunch!
  const getPossiblePeriodStarts = (span: number): number[] => {
    const starts: number[] = [];
    for (let p = 1; p <= periodsCount - span + 1; p++) {
      if (lunchAfter > 0 && p <= lunchAfter && (p + span - 1) > lunchAfter) {
        continue;
      }
      starts.push(p);
    }
    return starts.length > 0 ? starts : [1];
  };

  // Helper candidate slot interface
  interface ScoredCandidateSlot {
    day: DayOfWeek;
    startPeriod: number;
    room: typeof rooms[0];
    score: number;
    facDayKey: string;
    facWeekKey: string;
    secTotalKey: string;
    secTeachKey: string;
    cDayKey: string;
    currentDaily: number;
    currentWeekly: number;
    currentSectionDailyTotal: number;
    currentSectionTeachingHours: number;
    isTeaching: boolean;
    isLab: boolean;
    secLabKey: string;
  }

  // Objective scoring function for student relief, continuous blocks, and gap prevention
  const scoreCandidateSlot = (params: {
    demand: ScheduleDemand;
    day: DayOfWeek;
    startPeriod: number;
    room: typeof rooms[0];
    homeRoomId?: string;
  }): number => {
    const { demand, day, startPeriod, room, homeRoomId } = params;
    let score = 0;
    const endPeriod = startPeriod + demand.span - 1;

    const secDayKey = `${demand.sectionName}:${day}`;
    const secOccupied = sectionDayPeriods.get(secDayKey) || new Set<number>();

    // Simulate candidate occupied periods for this section on this day
    const simulatedPeriods = new Set(secOccupied);
    for (let s = 0; s < demand.span; s++) {
      simulatedPeriods.add(startPeriod + s);
    }

    const morning = Array.from(simulatedPeriods)
      .filter((p) => (lunchAfter > 0 ? p <= lunchAfter : p <= 4))
      .sort((a, b) => a - b);
    const afternoon = Array.from(simulatedPeriods)
      .filter((p) => (lunchAfter > 0 ? p > lunchAfter : p > 4))
      .sort((a, b) => a - b);

    // 1. Strict Prohibition of ANY Morning Gap (e.g. 8:30 at P1 and 11:30 at P4)
    if (morning.length > 1) {
      const morningSpan = morning[morning.length - 1] - morning[0] + 1;
      const morningGap = morningSpan - morning.length;
      if (morningGap > 0) {
        score -= 6000 * morningGap; // Severe penalty for ANY hole between morning classes
      } else {
        score += 350; // Bonus for a continuous morning block
      }
    }

    // 2. Strict Prohibition of ANY Afternoon Gap (e.g. P5 and P7)
    if (afternoon.length > 1) {
      const afternoonSpan = afternoon[afternoon.length - 1] - afternoon[0] + 1;
      const afternoonGap = afternoonSpan - afternoon.length;
      if (afternoonGap > 0) {
        score -= 6000 * afternoonGap; // Severe penalty for ANY hole between afternoon classes
      } else {
        score += 350; // Bonus for a continuous afternoon block
      }
    }

    // 2B. Strict Prohibition of Dead Gap Across Lunch Recess (e.g. classes at P3 and P5 with P4 empty)
    if (morning.length > 0 && afternoon.length > 0 && lunchAfter > 0) {
      const lastMorning = morning[morning.length - 1];
      const firstAfternoon = afternoon[0];
      if (lastMorning < lunchAfter && firstAfternoon === lunchAfter + 1) {
        score -= 6000; // Strong penalty for leaving P4 empty between P3 and P5
      }
    }

    // 3. Minimum 2 Hours Continuous Rule (No isolated 1-hour session)
    // If a session has only 1 class in the morning, or only 1 class in the afternoon:
    if (morning.length === 1 && demand.span === 1) {
      score -= 3000; // Strongly discourage leaving an isolated 1-hr class
    }
    if (afternoon.length === 1 && demand.span === 1) {
      score -= 3000;
    }

    // 4. Contiguity: direct attachment to an existing class
    const connectsBefore = secOccupied.has(startPeriod - 1);
    const connectsAfter = secOccupied.has(endPeriod + 1);
    if (connectsBefore) score += 200;
    if (connectsAfter) score += 200;
    if (connectsBefore && connectsAfter) score += 250;

    // 5. Daily Relief & Load Balance:
    const secTotalKey = `section:${demand.sectionName}:${day}:total_hours`;
    const curSecDayHrs = sectionDayTotalHours.get(secTotalKey) || 0;

    if (curSecDayHrs === 0) {
      if (demand.span === 1) {
        let otherDaysCanGrow = false;
        for (const d of activeDays) {
          if (d === day) continue;
          const dHrs = sectionDayTotalHours.get(`section:${demand.sectionName}:${d}:total_hours`) || 0;
          if (dHrs >= 1 && dHrs <= 3) {
            otherDaysCanGrow = true;
            break;
          }
        }
        if (otherDaysCanGrow) {
          score -= 350; // Strongly prefer attaching to days that already have classes
        }
      } else {
        score += 120; // Multi-hour lab on a fresh day starts a solid >= 2-hr block!
      }
    } else if (curSecDayHrs === 1) {
      score += 450; // Rescues single-hour day into a solid 2-hour block!
    } else if (curSecDayHrs === 2) {
      score += 300; // Perfect 3-hour continuous run
    } else if (curSecDayHrs === 3) {
      score += 100;
    } else if (curSecDayHrs >= 4) {
      score -= 150;
    }

    // 6. Home Classroom Affinity
    if (homeRoomId && room.id === homeRoomId) {
      score += 60;
    }

    // 7. Faculty Gap Reduction
    const facDayKey = `${demand.facultyId}:${day}`;
    const facOccupied = facultyDayPeriods.get(facDayKey) || new Set<number>();
    if (startPeriod - 2 >= 1 && facOccupied.has(startPeriod - 2) && !facOccupied.has(startPeriod - 1)) {
      score -= 300;
    }
    if (endPeriod + 2 <= periodsCount && facOccupied.has(endPeriod + 2) && !facOccupied.has(endPeriod + 1)) {
      score -= 300;
    }

    // 8. Soft Time-Off Avoidance Penalty (State 2: Conditional/Avoid)
    const facTO = facTimeOffMap.get(demand.facultyId);
    if (facTO && facTO[day]) {
      for (let s = 0; s < demand.span; s++) {
        if (facTO[day][startPeriod + s - 1] === 2) {
          score -= 400;
        }
      }
    }

    return score;
  };

  // =========================================================================
  // PHASE 1: Scored Best-Fit Constructive Placement
  // =========================================================================
  for (const demand of demands) {
    let placed = false;
    let failureReason = 'No clash-free slot found across all days and periods';

    const possibleStarts = getPossiblePeriodStarts(demand.span);

    const isLabDemand = demand.span > 1 || demand.preferredRoomType === 'COMPUTER_LAB' || demand.courseCode.endsWith('L') || demand.courseCode.endsWith('-PR') || demand.courseName.toLowerCase().includes('lab');

    let candidateRooms: typeof rooms;
    let homeRoomId: string | undefined;

    if (isLabDemand) {
      // Practical Labs MUST strictly be assigned to computer/engineering labs. NEVER to lecture halls!
      const labRooms = rooms.filter((r) => r.type === 'COMPUTER_LAB' || r.type === 'LAB');
      candidateRooms = labRooms.length > 0 ? labRooms : rooms.filter((r) => r.type === 'COMPUTER_LAB');
      homeRoomId = undefined; // Do not bias lab to theory home classroom
    } else {
      // Theory classes MUST be in lecture halls/classrooms, prioritizing dedicated section home room.
      const theoryRooms = rooms.filter((r) => r.type === 'LECTURE_HALL' || r.type === 'CLASSROOM' || r.type === 'SEMINAR_HALL');
      homeRoomId = sectionHomeRoomMap.get(demand.sectionName);
      candidateRooms = theoryRooms.length > 0 ? [...theoryRooms] : [...rooms];
      if (homeRoomId) {
        candidateRooms.sort((a, b) => {
          if (a.id === homeRoomId && b.id !== homeRoomId) return -1;
          if (b.id === homeRoomId && a.id !== homeRoomId) return 1;
          return 0;
        });
      }
    }

    // Pass 1: Strict mode (allowAdjacentDiffSections = false) ensures zero back-to-back cross-section classes
    // Pass 2: Fallback only if physically impossible otherwise
    for (const allowAdjacentDiffSections of [false, true]) {
      if (placed) break;

      for (const maxLabsPerDay of [1, 2]) {
        if (placed) break;

        for (const maxPerDay of [1]) {
          if (placed) break;

          const candidateSlots: ScoredCandidateSlot[] = [];

          for (const day of activeDays) {
            const cDayKey = `course:${demand.courseId}:${demand.sectionName}:${day}`;
            if ((courseDayCount.get(cDayKey) || 0) >= maxPerDay) {
              continue;
            }

            // Balance daily workloads: Max multi-span lab per day for a section (progressive: 1, fallback to 2)
            const secLabKey = `section:${demand.sectionName}:${day}:labs`;
            if (demand.span > 1 && (sectionLabDayCount.get(secLabKey) || 0) >= maxLabsPerDay) {
              continue;
            }

          const facDayKey = `faculty:${demand.facultyId}:${day}`;
          const currentDaily = facultyPeriodCounts.get(facDayKey) || 0;
          const facLimits = facultyCapMap.get(demand.facultyId) || { daily: 4, weekly: 18 };
          if (currentDaily + demand.span > facLimits.daily) {
            failureReason = `Faculty ${demand.facultyCode} daily period limit (${facLimits.daily}) reached for ${day}`;
            continue;
          }

          const facWeekKey = `faculty:${demand.facultyId}:week`;
          const currentWeekly = facultyPeriodCounts.get(facWeekKey) || 0;
          if (currentWeekly + demand.span > facLimits.weekly) {
            failureReason = `Faculty ${demand.facultyCode} weekly period limit (${facLimits.weekly}) reached`;
            continue;
          }

          const secTotalKey = `section:${demand.sectionName}:${day}:total_hours`;
          const currentSectionDailyTotal = sectionDayTotalHours.get(secTotalKey) || 0;
          if (currentSectionDailyTotal + demand.span > 7) {
            failureReason = `Section ${demand.sectionName} daily total class/lab limit (max 7 hours) reached for ${day}`;
            continue;
          }

          const secTeachKey = `section:${demand.sectionName}:${day}:teaching_hours`;
          const currentSectionTeachingHours = sectionDayTeachingHours.get(secTeachKey) || 0;
          const isTeaching = demand.span === 1;
          if (isTeaching && currentSectionTeachingHours + 1 > 5) {
            failureReason = `Section ${demand.sectionName} daily teaching class limit (max 5 hours) reached for ${day}`;
            continue;
          }

          for (const startPeriod of possibleStarts) {
            // Check Section Availability (occupied or blocked by section time-off)
            let sectionBusy = false;
            const secTimeOff = demand.sectionId ? secTimeOffMap.get(demand.sectionId) : undefined;
            for (let s = 0; s < demand.span; s++) {
              const p = startPeriod + s;
              if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${p}`)) {
                sectionBusy = true;
                break;
              }
              if (secTimeOff && secTimeOff[day] && secTimeOff[day][p - 1] === 0) {
                sectionBusy = true;
                break;
              }
            }
            if (sectionBusy) continue;

            // Student Continuous Limit: Max 4 hours continuous in 1 session
            const sessionStart = lunchAfter > 0 && startPeriod > lunchAfter ? lunchAfter + 1 : 1;
            const sessionEnd = lunchAfter > 0 && startPeriod <= lunchAfter ? lunchAfter : periodsCount;

            let runBefore = 0;
            for (let p = startPeriod - 1; p >= sessionStart; p--) {
              if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${p}`)) runBefore++;
              else break;
            }

            let runAfter = 0;
            for (let p = startPeriod + demand.span; p <= sessionEnd; p++) {
              if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${p}`)) runAfter++;
              else break;
            }

            if (runBefore + demand.span + runAfter > 4) continue;

            // Check Faculty Availability (occupied or blocked by faculty time-off)
            let facultyBusy = false;
            const facTimeOff = facTimeOffMap.get(demand.facultyId);
            for (let s = 0; s < demand.span; s++) {
              const p = startPeriod + s;
              if (occupiedSlots.has(`faculty:${demand.facultyId}:${day}:${p}`)) {
                facultyBusy = true;
                break;
              }
              if (facTimeOff && facTimeOff[day] && facTimeOff[day][p - 1] === 0) {
                facultyBusy = true;
                break;
              }
            }
            if (facultyBusy) continue;

            // Faculty Continuous Limit: Max 2 hours continuous without a break
            let facRunBefore = 0;
            for (let p = startPeriod - 1; p >= sessionStart; p--) {
              if (occupiedSlots.has(`faculty:${demand.facultyId}:${day}:${p}`)) facRunBefore++;
              else break;
            }
            let facRunAfter = 0;
            for (let p = startPeriod + demand.span; p <= sessionEnd; p++) {
              if (occupiedSlots.has(`faculty:${demand.facultyId}:${day}:${p}`)) facRunAfter++;
              else break;
            }
            if (facRunBefore + demand.span + facRunAfter > 2) continue;

            // Invariant: "For a faculty don't assign adjacent classes in diff sections"
            let hasAdjacentDiffSection = false;
            const pPrev = startPeriod - 1;
            if (pPrev >= 1 && !(lunchAfter > 0 && pPrev === lunchAfter)) {
              const prevSection = facultySectionSlotMap.get(`faculty:${demand.facultyId}:${day}:${pPrev}`);
              if (prevSection && prevSection !== demand.sectionName) hasAdjacentDiffSection = true;
            }

            const pNext = startPeriod + demand.span;
            if (pNext <= periodsCount && !(lunchAfter > 0 && (startPeriod + demand.span - 1) === lunchAfter)) {
              const nextSection = facultySectionSlotMap.get(`faculty:${demand.facultyId}:${day}:${pNext}`);
              if (nextSection && nextSection !== demand.sectionName) hasAdjacentDiffSection = true;
            }

            if (hasAdjacentDiffSection && !allowAdjacentDiffSections) continue;

            // Find best available room for this slot
            for (const room of candidateRooms) {
              let roomBusy = false;
              const rTimeOff = roomTimeOffMap.get(room.id);
              for (let s = 0; s < demand.span; s++) {
                const p = startPeriod + s;
                if (occupiedSlots.has(`room:${room.id}:${day}:${p}`)) {
                  roomBusy = true;
                  break;
                }
                if (rTimeOff && rTimeOff[day] && rTimeOff[day][p - 1] === 0) {
                  roomBusy = true;
                  break;
                }
              }

              if (!roomBusy) {
                const score = scoreCandidateSlot({
                  demand,
                  day,
                  startPeriod,
                  room,
                  homeRoomId,
                });

                candidateSlots.push({
                  day,
                  startPeriod,
                  room,
                  score,
                  facDayKey,
                  facWeekKey,
                  secTotalKey,
                  secTeachKey,
                  cDayKey,
                  currentDaily,
                  currentWeekly,
                  currentSectionDailyTotal,
                  currentSectionTeachingHours,
                  isTeaching,
                  isLab: demand.span > 1,
                  secLabKey,
                });
                break; // room candidate found for this (day, startPeriod)
              }
            }
          }
        }

        // If candidate slots were found, select the one with the highest score!
        if (candidateSlots.length > 0) {
          candidateSlots.sort((a, b) => b.score - a.score);
          const chosen = candidateSlots[0];

          // Commit slot into occupied trackers
          const secDayKey = `${demand.sectionName}:${chosen.day}`;
          if (!sectionDayPeriods.has(secDayKey)) sectionDayPeriods.set(secDayKey, new Set<number>());
          const facDayKeyStr = `${demand.facultyId}:${chosen.day}`;
          if (!facultyDayPeriods.has(facDayKeyStr)) facultyDayPeriods.set(facDayKeyStr, new Set<number>());

          for (let s = 0; s < demand.span; s++) {
            const pIdx = chosen.startPeriod + s;
            occupiedSlots.add(`room:${chosen.room.id}:${chosen.day}:${pIdx}`);
            occupiedSlots.add(`faculty:${demand.facultyId}:${chosen.day}:${pIdx}`);
            occupiedSlots.add(`section:${demand.sectionName}:${chosen.day}:${pIdx}`);
            facultySectionSlotMap.set(`faculty:${demand.facultyId}:${chosen.day}:${pIdx}`, demand.sectionName);
            sectionDayPeriods.get(secDayKey)!.add(pIdx);
            facultyDayPeriods.get(facDayKeyStr)!.add(pIdx);
          }

          facultyPeriodCounts.set(chosen.facDayKey, chosen.currentDaily + demand.span);
          facultyPeriodCounts.set(chosen.facWeekKey, chosen.currentWeekly + demand.span);

          sectionDayTotalHours.set(chosen.secTotalKey, chosen.currentSectionDailyTotal + demand.span);
          if (chosen.isTeaching) {
            sectionDayTeachingHours.set(chosen.secTeachKey, chosen.currentSectionTeachingHours + 1);
          }
          if (chosen.isLab) {
            sectionLabDayCount.set(chosen.secLabKey, (sectionLabDayCount.get(chosen.secLabKey) || 0) + 1);
          }

          courseDayCount.set(chosen.cDayKey, (courseDayCount.get(chosen.cDayKey) || 0) + 1);

          placedSessions.push({
            id: 'sess_' + Math.random().toString(36).substring(2, 10),
            day: chosen.day,
            periodIndex: chosen.startPeriod,
            span: demand.span,
            courseId: demand.courseId,
            courseCode: demand.courseCode,
            courseName: demand.courseName,
            facultyId: demand.facultyId,
            facultyName: demand.facultyName,
            roomId: chosen.room.id,
            roomCode: chosen.room.code,
            roomName: chosen.room.name,
            sectionName: demand.sectionName,
            isPinned: false,
          });

          placed = true;
          break;
        }
      }
    }
  }

    if (!placed) {
      unplacedDemands.push({ demand, reason: failureReason });
    }
  }

  // =========================================================================
  // PHASE 2A: Gap Compaction (Slide neighboring sessions to close ANY intra-session gap >= 1)
  // =========================================================================
  for (const day of activeDays) {
    for (const sec of sectionsToSchedule) {
      const secName = (sec.department_code && !sec.name.toUpperCase().startsWith(sec.department_code.toUpperCase()))
        ? `${sec.department_code} - ${sec.name}`
        : sec.name;

      // Repeat compaction passes until no more gaps can be closed
      for (let pass = 0; pass < 3; pass++) {
        const daySessions = placedSessions
          .filter((s) => s.sectionName === secName && s.day === day)
          .sort((a, b) => a.periodIndex - b.periodIndex);

        if (daySessions.length < 2) break;
        let changed = false;

        for (let i = 0; i < daySessions.length - 1; i++) {
          const s1 = daySessions[i];
          const s2 = daySessions[i + 1];

          const s1End = s1.periodIndex + s1.span - 1;
          const s2Start = s2.periodIndex;
          const gap = s2Start - s1End - 1;

          // Found a gap inside the same session (e.g. both in morning or both in afternoon), or after lunch delay
          const inSameMorning = lunchAfter > 0 && s1End <= lunchAfter && s2Start <= lunchAfter;
          const inSameAfternoon = lunchAfter > 0 && s1End > lunchAfter && s2Start > lunchAfter;
          const crossesLunch = lunchAfter > 0 && s1End <= lunchAfter && s2Start > lunchAfter;
          const hasAfternoonDelay = crossesLunch && s2Start > lunchAfter + 1;

          if ((gap >= 1 && (inSameMorning || inSameAfternoon)) || hasAfternoonDelay) {
            // Option B: Slide s2 backward towards s1 so s2 starts right after s1 ends (or right after lunch)
            // e.g. s1 at P1 (span 1), s2 at P4 (span 1) -> newStart for s2 is P1 + 1 = P2
            if (!s2.isPinned) {
              const newStart = crossesLunch ? (lunchAfter + 1) : (s1End + 1);
              const newEnd = newStart + s2.span - 1;

              let facFree = true;
              let roomFree = true;
              let secFree = true;

              for (let p = newStart; p <= newEnd; p++) {
                if (p >= s2.periodIndex && p <= s2.periodIndex + s2.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s2.facultyId}:${day}:${p}`)) facFree = false;
                if (occupiedSlots.has(`room:${s2.roomId}:${day}:${p}`)) roomFree = false;
                if (occupiedSlots.has(`section:${secName}:${day}:${p}`)) secFree = false;
                const facTO = facTimeOffMap.get(s2.facultyId);
                if (facTO && facTO[day] && facTO[day][p - 1] === 0) facFree = false;
                const rTO = roomTimeOffMap.get(s2.roomId);
                if (rTO && rTO[day] && rTO[day][p - 1] === 0) roomFree = false;
                const sTO = sec.id ? secTimeOffMap.get(sec.id) : undefined;
                if (sTO && sTO[day] && sTO[day][p - 1] === 0) secFree = false;
              }

              let facAdjacentOk = true;
              if (newStart - 1 >= 1 && !(lunchAfter > 0 && newStart - 1 === lunchAfter)) {
                const prevSec = facultySectionSlotMap.get(`faculty:${s2.facultyId}:${day}:${newStart - 1}`);
                if (prevSec && prevSec !== secName) facAdjacentOk = false;
              }
              if (newEnd + 1 <= periodsCount && !(lunchAfter > 0 && newEnd === lunchAfter)) {
                const nextSec = facultySectionSlotMap.get(`faculty:${s2.facultyId}:${day}:${newEnd + 1}`);
                if (nextSec && nextSec !== secName) facAdjacentOk = false;
              }

              const s2SessionStart = lunchAfter > 0 && newStart > lunchAfter ? lunchAfter + 1 : 1;
              const s2SessionEnd = lunchAfter > 0 && newStart <= lunchAfter ? lunchAfter : periodsCount;
              let s2FacRunBefore = 0;
              for (let p = newStart - 1; p >= s2SessionStart; p--) {
                if (p >= s2.periodIndex && p <= s2.periodIndex + s2.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s2.facultyId}:${day}:${p}`)) s2FacRunBefore++;
                else break;
              }
              let s2FacRunAfter = 0;
              for (let p = newEnd + 1; p <= s2SessionEnd; p++) {
                if (p >= s2.periodIndex && p <= s2.periodIndex + s2.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s2.facultyId}:${day}:${p}`)) s2FacRunAfter++;
                else break;
              }
              const s2FacContinuous = s2FacRunBefore + s2.span + s2FacRunAfter;

              const continuousRun = crossesLunch ? s2.span : (s1.span + s2.span);
              if (facFree && roomFree && secFree && facAdjacentOk && continuousRun <= 4 && s2FacContinuous <= 2) {
                for (let p = 0; p < s2.span; p++) {
                  const oldP = s2.periodIndex + p;
                  occupiedSlots.delete(`room:${s2.roomId}:${day}:${oldP}`);
                  occupiedSlots.delete(`faculty:${s2.facultyId}:${day}:${oldP}`);
                  occupiedSlots.delete(`section:${secName}:${day}:${oldP}`);
                  facultySectionSlotMap.delete(`faculty:${s2.facultyId}:${day}:${oldP}`);
                  sectionDayPeriods.get(`${secName}:${day}`)?.delete(oldP);
                  facultyDayPeriods.get(`${s2.facultyId}:${day}`)?.delete(oldP);
                }

                s2.periodIndex = newStart;

                for (let p = 0; p < s2.span; p++) {
                  const newP = s2.periodIndex + p;
                  occupiedSlots.add(`room:${s2.roomId}:${day}:${newP}`);
                  occupiedSlots.add(`faculty:${s2.facultyId}:${day}:${newP}`);
                  occupiedSlots.add(`section:${secName}:${day}:${newP}`);
                  facultySectionSlotMap.set(`faculty:${s2.facultyId}:${day}:${newP}`, secName);
                  sectionDayPeriods.get(`${secName}:${day}`)?.add(newP);
                  facultyDayPeriods.get(`${s2.facultyId}:${day}`)?.add(newP);
                }
                changed = true;
                break;
              }
            }

            // Option A (Fallback): Slide s1 forward towards s2 so s1 ends right before s2 starts!
            // e.g. s1 at P1 (span 1), s2 at P4 (span 1) -> newStart for s1 is P4 - 1 = P3
            if (!s1.isPinned && (inSameMorning || inSameAfternoon)) {
              const newStart = s2.periodIndex - s1.span;
              const newEnd = newStart + s1.span - 1;

              // Check if all periods in [newStart..newEnd] are free
              let facFree = true;
              let roomFree = true;
              let secFree = true;

              for (let p = newStart; p <= newEnd; p++) {
                if (p >= s1.periodIndex && p <= s1.periodIndex + s1.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s1.facultyId}:${day}:${p}`)) facFree = false;
                if (occupiedSlots.has(`room:${s1.roomId}:${day}:${p}`)) roomFree = false;
                if (occupiedSlots.has(`section:${secName}:${day}:${p}`)) secFree = false;
                const facTO = facTimeOffMap.get(s1.facultyId);
                if (facTO && facTO[day] && facTO[day][p - 1] === 0) facFree = false;
                const rTO = roomTimeOffMap.get(s1.roomId);
                if (rTO && rTO[day] && rTO[day][p - 1] === 0) roomFree = false;
                const sTO = sec.id ? secTimeOffMap.get(sec.id) : undefined;
                if (sTO && sTO[day] && sTO[day][p - 1] === 0) secFree = false;
              }

              let facAdjacentOk = true;
              if (newStart - 1 >= 1 && !(lunchAfter > 0 && newStart - 1 === lunchAfter)) {
                const prevSec = facultySectionSlotMap.get(`faculty:${s1.facultyId}:${day}:${newStart - 1}`);
                if (prevSec && prevSec !== secName) facAdjacentOk = false;
              }
              if (newEnd + 1 <= periodsCount && !(lunchAfter > 0 && newEnd === lunchAfter)) {
                const nextSec = facultySectionSlotMap.get(`faculty:${s1.facultyId}:${day}:${newEnd + 1}`);
                if (nextSec && nextSec !== secName) facAdjacentOk = false;
              }

              const s1SessionStart = lunchAfter > 0 && newStart > lunchAfter ? lunchAfter + 1 : 1;
              const s1SessionEnd = lunchAfter > 0 && newStart <= lunchAfter ? lunchAfter : periodsCount;
              let s1FacRunBefore = 0;
              for (let p = newStart - 1; p >= s1SessionStart; p--) {
                if (p >= s1.periodIndex && p <= s1.periodIndex + s1.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s1.facultyId}:${day}:${p}`)) s1FacRunBefore++;
                else break;
              }
              let s1FacRunAfter = 0;
              for (let p = newEnd + 1; p <= s1SessionEnd; p++) {
                if (p >= s1.periodIndex && p <= s1.periodIndex + s1.span - 1) continue;
                if (occupiedSlots.has(`faculty:${s1.facultyId}:${day}:${p}`)) s1FacRunAfter++;
                else break;
              }
              const s1FacContinuous = s1FacRunBefore + s1.span + s1FacRunAfter;

              const continuousRun = s1.span + s2.span;
              if (facFree && roomFree && secFree && facAdjacentOk && continuousRun <= 4 && s1FacContinuous <= 2) {
                // Remove s1 from old slots
                for (let p = 0; p < s1.span; p++) {
                  const oldP = s1.periodIndex + p;
                  occupiedSlots.delete(`room:${s1.roomId}:${day}:${oldP}`);
                  occupiedSlots.delete(`faculty:${s1.facultyId}:${day}:${oldP}`);
                  occupiedSlots.delete(`section:${secName}:${day}:${oldP}`);
                  facultySectionSlotMap.delete(`faculty:${s1.facultyId}:${day}:${oldP}`);
                  sectionDayPeriods.get(`${secName}:${day}`)?.delete(oldP);
                  facultyDayPeriods.get(`${s1.facultyId}:${day}`)?.delete(oldP);
                }

                s1.periodIndex = newStart;

                // Add s1 to new slots
                for (let p = 0; p < s1.span; p++) {
                  const newP = s1.periodIndex + p;
                  occupiedSlots.add(`room:${s1.roomId}:${day}:${newP}`);
                  occupiedSlots.add(`faculty:${s1.facultyId}:${day}:${newP}`);
                  occupiedSlots.add(`section:${secName}:${day}:${newP}`);
                  facultySectionSlotMap.set(`faculty:${s1.facultyId}:${day}:${newP}`, secName);
                  sectionDayPeriods.get(`${secName}:${day}`)?.add(newP);
                  facultyDayPeriods.get(`${s1.facultyId}:${day}`)?.add(newP);
                }
                changed = true;
                break;
              }
            }
          }
        }

        if (!changed) break;
      }
    }
  }

  // =========================================================================
  // PHASE 2B: Isolated 1-Hour Session Eliminator (Guarantees >= 2 hours continuous)
  // Multi-pass loop ensures any session left isolated by earlier moves gets resolved
  // =========================================================================
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;

    for (const sec of sectionsToSchedule) {
      const secName = (sec.department_code && !sec.name.toUpperCase().startsWith(sec.department_code.toUpperCase()))
        ? `${sec.department_code} - ${sec.name}`
        : sec.name;

      for (const singleDay of activeDays) {
        // Query fresh sessions for this section on this day
        const currentSingleDaySessions = placedSessions.filter((s) => s.sectionName === secName && s.day === singleDay);

        // Identify any session that is isolated (not contiguous with any other session in morning or afternoon)
        const isolatedSessions = currentSingleDaySessions.filter((s) => {
          if (s.isPinned || s.span > 1) return false;
          const inMorning = lunchAfter > 0 && s.periodIndex <= lunchAfter;
          const touchesPrev = currentSingleDaySessions.some((other) => {
            const otherMorning = lunchAfter > 0 && other.periodIndex <= lunchAfter;
            return inMorning === otherMorning && other.periodIndex + other.span === s.periodIndex;
          });
          const touchesNext = currentSingleDaySessions.some((other) => {
            const otherMorning = lunchAfter > 0 && other.periodIndex <= lunchAfter;
            return inMorning === otherMorning && s.periodIndex + s.span === other.periodIndex;
          });
          return !touchesPrev && !touchesNext;
        });

        for (const sessToMove of isolatedSessions) {
          if (sessToMove.day !== singleDay) continue; // Already moved in earlier step
          let resolved = false;

          // Step 1: Can sessToMove slide on the SAME day to touch an existing session in the same morning/afternoon?
          const otherSessionsOnSameDay = placedSessions.filter(
            (s) => s.sectionName === secName && s.day === singleDay && s.id !== sessToMove.id
          );

          for (const targetSess of otherSessionsOnSameDay) {
            if (resolved) break;
            if (targetSess.courseId === sessToMove.courseId) continue; // Never attach to same course on same day

            const isMorning = lunchAfter > 0 && targetSess.periodIndex <= lunchAfter;
            const candidateStarts: number[] = [];
            const beforeStart = targetSess.periodIndex - sessToMove.span;
            const afterStart = targetSess.periodIndex + targetSess.span;

            if (isMorning) {
              if (beforeStart >= 1) candidateStarts.push(beforeStart);
              if (afterStart <= lunchAfter) candidateStarts.push(afterStart);
            } else {
              if (lunchAfter > 0 ? beforeStart > lunchAfter : beforeStart >= 1) candidateStarts.push(beforeStart);
              if (afterStart <= periodsCount) candidateStarts.push(afterStart);
            }

            for (const testPeriod of candidateStarts) {
              const testEnd = testPeriod + sessToMove.span - 1;
              if (lunchAfter > 0 && testPeriod <= lunchAfter && testEnd > lunchAfter) continue;

              if (occupiedSlots.has(`section:${secName}:${singleDay}:${testPeriod}`)) continue;
              if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${singleDay}:${testPeriod}`)) continue;

              const facTO1 = facTimeOffMap.get(sessToMove.facultyId);
              if (facTO1 && facTO1[singleDay] && facTO1[singleDay][testPeriod - 1] === 0) continue;
              const sTO1 = sec.id ? secTimeOffMap.get(sec.id) : undefined;
              if (sTO1 && sTO1[singleDay] && sTO1[singleDay][testPeriod - 1] === 0) continue;

              let facAdjOk = true;
              if (testPeriod - 1 >= 1 && !(lunchAfter > 0 && testPeriod - 1 === lunchAfter)) {
                const prevSec = facultySectionSlotMap.get(`faculty:${sessToMove.facultyId}:${singleDay}:${testPeriod - 1}`);
                if (prevSec && prevSec !== secName) facAdjOk = false;
              }
              if (testEnd + 1 <= periodsCount && !(lunchAfter > 0 && testEnd === lunchAfter)) {
                const nextSec = facultySectionSlotMap.get(`faculty:${sessToMove.facultyId}:${singleDay}:${testEnd + 1}`);
                if (nextSec && nextSec !== secName) facAdjOk = false;
              }
              if (!facAdjOk) continue;

              // Faculty continuous teaching limit: max 2 hours
              const fSessionStart = lunchAfter > 0 && testPeriod > lunchAfter ? lunchAfter + 1 : 1;
              const fSessionEnd = lunchAfter > 0 && testPeriod <= lunchAfter ? lunchAfter : periodsCount;
              let fRunBefore = 0;
              for (let p = testPeriod - 1; p >= fSessionStart; p--) {
                if (p === sessToMove.periodIndex) continue;
                if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${singleDay}:${p}`)) fRunBefore++;
                else break;
              }
              let fRunAfter = 0;
              for (let p = testEnd + 1; p <= fSessionEnd; p++) {
                if (p === sessToMove.periodIndex) continue;
                if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${singleDay}:${p}`)) fRunAfter++;
                else break;
              }
              if (fRunBefore + sessToMove.span + fRunAfter > 2) continue;

              let chosenRoomId = sessToMove.roomId;
              let chosenRoomCode = sessToMove.roomCode;
              let chosenRoomName = sessToMove.roomName;

              if (!isTheoryRoomAvailable(chosenRoomId, singleDay, testPeriod)) {
                const altRoom = getAvailableTheoryRoom(singleDay, testPeriod);
                if (altRoom) {
                  chosenRoomId = altRoom.id;
                  chosenRoomCode = altRoom.code;
                  chosenRoomName = altRoom.name;
                } else {
                  continue;
                }
              }

              // Perform slide on same day
              occupiedSlots.delete(`room:${sessToMove.roomId}:${singleDay}:${sessToMove.periodIndex}`);
              occupiedSlots.delete(`faculty:${sessToMove.facultyId}:${singleDay}:${sessToMove.periodIndex}`);
              occupiedSlots.delete(`section:${secName}:${singleDay}:${sessToMove.periodIndex}`);
              facultySectionSlotMap.delete(`faculty:${sessToMove.facultyId}:${singleDay}:${sessToMove.periodIndex}`);
              sectionDayPeriods.get(`${secName}:${singleDay}`)?.delete(sessToMove.periodIndex);
              facultyDayPeriods.get(`${sessToMove.facultyId}:${singleDay}`)?.delete(sessToMove.periodIndex);

              sessToMove.periodIndex = testPeriod;
              sessToMove.roomId = chosenRoomId;
              sessToMove.roomCode = chosenRoomCode;
              sessToMove.roomName = chosenRoomName;

              occupiedSlots.add(`room:${chosenRoomId}:${singleDay}:${testPeriod}`);
              occupiedSlots.add(`faculty:${sessToMove.facultyId}:${singleDay}:${testPeriod}`);
              occupiedSlots.add(`section:${secName}:${singleDay}:${testPeriod}`);
              facultySectionSlotMap.set(`faculty:${sessToMove.facultyId}:${singleDay}:${testPeriod}`, secName);
              sectionDayPeriods.get(`${secName}:${singleDay}`)?.add(testPeriod);
              facultyDayPeriods.get(`${sessToMove.facultyId}:${singleDay}`)?.add(testPeriod);

              resolved = true;
              changed = true;
              break;
            }
          }

          if (resolved) continue;

          // Step 2: Relocate sessToMove to ANOTHER DAY where it attaches into a >= 2 hr block
          for (const targetDay of activeDays) {
            if (targetDay === singleDay || resolved) continue;

            const targetSessions = placedSessions.filter((s) => s.sectionName === secName && s.day === targetDay);
            const targetTotalHrs = targetSessions.reduce((acc, s) => acc + s.span, 0);
            const targetTheoryHrs = targetSessions.filter((s) => s.span === 1).length;

            // Target day can have 1..4 hours (so adding 1 hour produces 2..5 hours)
            if (targetTotalHrs < 1 || targetTotalHrs > 4 || targetTheoryHrs >= 5) continue;

            const cTargetCount = targetSessions.filter((s) => s.courseId === sessToMove.courseId).length;
            if (cTargetCount >= 1) continue;

            const facTargetCount = facultyPeriodCounts.get(`faculty:${sessToMove.facultyId}:${targetDay}`) || 0;
            const facLimits = facultyCapMap.get(sessToMove.facultyId) || { daily: 4, weekly: 18 };
            if (facTargetCount + 1 > facLimits.daily) continue;

            // Connect directly to any existing block on target day, respecting lunch recess
            const touchingPeriods = new Set<number>();
            for (const s of targetSessions) {
              const isMorning = lunchAfter > 0 && s.periodIndex <= lunchAfter;
              const beforeStart = s.periodIndex - sessToMove.span;
              const afterStart = s.periodIndex + s.span;

              if (isMorning) {
                if (beforeStart >= 1) touchingPeriods.add(beforeStart);
                if (afterStart <= lunchAfter) touchingPeriods.add(afterStart);
              } else {
                if (lunchAfter > 0 ? beforeStart > lunchAfter : beforeStart >= 1) touchingPeriods.add(beforeStart);
                if (afterStart <= periodsCount) touchingPeriods.add(afterStart);
              }
            }
            const candidatePeriods = Array.from(touchingPeriods).filter((p) => p >= 1 && p <= periodsCount);

            for (const testPeriod of candidatePeriods) {
              if (resolved) break;

              const testEnd = testPeriod + sessToMove.span - 1;
              if (lunchAfter > 0 && testPeriod <= lunchAfter && testEnd > lunchAfter) continue;

              if (occupiedSlots.has(`section:${secName}:${targetDay}:${testPeriod}`)) continue;
              if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${targetDay}:${testPeriod}`)) continue;

              const facTO2 = facTimeOffMap.get(sessToMove.facultyId);
              if (facTO2 && facTO2[targetDay] && facTO2[targetDay][testPeriod - 1] === 0) continue;
              const sTO2 = sec.id ? secTimeOffMap.get(sec.id) : undefined;
              if (sTO2 && sTO2[targetDay] && sTO2[targetDay][testPeriod - 1] === 0) continue;

              let facAdjOk = true;
              if (testPeriod - 1 >= 1 && !(lunchAfter > 0 && testPeriod - 1 === lunchAfter)) {
                const prevSec = facultySectionSlotMap.get(`faculty:${sessToMove.facultyId}:${targetDay}:${testPeriod - 1}`);
                if (prevSec && prevSec !== secName) facAdjOk = false;
              }
              if (testEnd + 1 <= periodsCount && !(lunchAfter > 0 && testEnd === lunchAfter)) {
                const nextSec = facultySectionSlotMap.get(`faculty:${sessToMove.facultyId}:${targetDay}:${testEnd + 1}`);
                if (nextSec && nextSec !== secName) facAdjOk = false;
              }
              if (!facAdjOk) continue;

              const sessionStart = lunchAfter > 0 && testPeriod > lunchAfter ? lunchAfter + 1 : 1;
              const sessionEnd = lunchAfter > 0 && testPeriod <= lunchAfter ? lunchAfter : periodsCount;
              let continuousRun = 1;
              for (let p = testPeriod - 1; p >= sessionStart; p--) {
                if (occupiedSlots.has(`section:${secName}:${targetDay}:${p}`)) continuousRun++;
                else break;
              }
              for (let p = testEnd + 1; p <= sessionEnd; p++) {
                if (occupiedSlots.has(`section:${secName}:${targetDay}:${p}`)) continuousRun++;
                else break;
              }
              if (continuousRun > 4) continue;

              // Faculty continuous teaching limit: max 2 hours
              let facContinuousRun = sessToMove.span;
              for (let p = testPeriod - 1; p >= sessionStart; p--) {
                if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${targetDay}:${p}`)) facContinuousRun++;
                else break;
              }
              for (let p = testEnd + 1; p <= sessionEnd; p++) {
                if (occupiedSlots.has(`faculty:${sessToMove.facultyId}:${targetDay}:${p}`)) facContinuousRun++;
                else break;
              }
              if (facContinuousRun > 2) continue;

              let chosenRoomId = sessToMove.roomId;
              let chosenRoomCode = sessToMove.roomCode;
              let chosenRoomName = sessToMove.roomName;

              if (!isTheoryRoomAvailable(chosenRoomId, targetDay, testPeriod)) {
                const altRoom = getAvailableTheoryRoom(targetDay, testPeriod);
                if (altRoom) {
                  chosenRoomId = altRoom.id;
                  chosenRoomCode = altRoom.code;
                  chosenRoomName = altRoom.name;
                } else {
                  continue;
                }
              }

              // Move session to targetDay!
              occupiedSlots.delete(`room:${sessToMove.roomId}:${singleDay}:${sessToMove.periodIndex}`);
              occupiedSlots.delete(`faculty:${sessToMove.facultyId}:${singleDay}:${sessToMove.periodIndex}`);
              occupiedSlots.delete(`section:${secName}:${singleDay}:${sessToMove.periodIndex}`);
              facultySectionSlotMap.delete(`faculty:${sessToMove.facultyId}:${singleDay}:${sessToMove.periodIndex}`);
              sectionDayPeriods.get(`${secName}:${singleDay}`)?.delete(sessToMove.periodIndex);
              facultyDayPeriods.get(`${sessToMove.facultyId}:${singleDay}`)?.delete(sessToMove.periodIndex);

              facultyPeriodCounts.set(`faculty:${sessToMove.facultyId}:${singleDay}`, (facultyPeriodCounts.get(`faculty:${sessToMove.facultyId}:${singleDay}`) || 1) - 1);
              facultyPeriodCounts.set(`faculty:${sessToMove.facultyId}:${targetDay}`, (facultyPeriodCounts.get(`faculty:${sessToMove.facultyId}:${targetDay}`) || 0) + 1);

              const oldDayRemaining = placedSessions.filter((s) => s.sectionName === secName && s.day === singleDay && s.id !== sessToMove.id);
              const oldDayRemainingTotal = oldDayRemaining.reduce((acc, s) => acc + s.span, 0);
              const oldDayRemainingTheory = oldDayRemaining.filter((s) => s.span === 1).length;

              sectionDayTotalHours.set(`section:${secName}:${singleDay}:total_hours`, oldDayRemainingTotal);
              sectionDayTotalHours.set(`section:${secName}:${singleDay}:teaching_hours`, oldDayRemainingTheory);
              sectionDayTotalHours.set(`section:${secName}:${targetDay}:total_hours`, targetTotalHrs + 1);
              sectionDayTeachingHours.set(`section:${secName}:${targetDay}:teaching_hours`, targetTheoryHrs + 1);

              occupiedSlots.add(`room:${chosenRoomId}:${targetDay}:${testPeriod}`);
              occupiedSlots.add(`faculty:${sessToMove.facultyId}:${targetDay}:${testPeriod}`);
              occupiedSlots.add(`section:${secName}:${targetDay}:${testPeriod}`);
              facultySectionSlotMap.set(`faculty:${sessToMove.facultyId}:${targetDay}:${testPeriod}`, secName);
              if (!sectionDayPeriods.has(`${secName}:${targetDay}`)) sectionDayPeriods.set(`${secName}:${targetDay}`, new Set<number>());
              sectionDayPeriods.get(`${secName}:${targetDay}`)!.add(testPeriod);
              if (!facultyDayPeriods.has(`${sessToMove.facultyId}:${targetDay}`)) facultyDayPeriods.set(`${sessToMove.facultyId}:${targetDay}`, new Set<number>());
              facultyDayPeriods.get(`${sessToMove.facultyId}:${targetDay}`)!.add(testPeriod);

              sessToMove.day = targetDay;
              sessToMove.periodIndex = testPeriod;
              sessToMove.roomId = chosenRoomId;
              sessToMove.roomCode = chosenRoomCode;
              sessToMove.roomName = chosenRoomName;

              resolved = true;
              changed = true;
              break;
            }
          }

          if (resolved) continue;

          // Step 3: Reverse Donor Compaction (Pull a session from an overloaded day to attach to sessToMove on singleDay)
          for (const donorDay of activeDays) {
            if (donorDay === singleDay || resolved) continue;

            const donorSessions = placedSessions.filter((s) => s.sectionName === secName && s.day === donorDay);
            const donorTotalHrs = donorSessions.reduce((acc, s) => acc + s.span, 0);
            if (donorTotalHrs < 4) continue; // Don't strip days that only have 2 or 3 hours

            // Candidate donor sessions: 1-hour theory sessions not pinned
            const donorCandidates = donorSessions.filter((s) => !s.isPinned && s.span === 1);

            for (const sDonor of donorCandidates) {
              if (resolved) break;

              // Check if trailing sessions on donorDay can slide backward to keep donorDay compact
              const isMorningDonor = lunchAfter > 0 && sDonor.periodIndex <= lunchAfter;
              const trailingDonor = donorSessions
                .filter((s) => s.id !== sDonor.id && s.periodIndex > sDonor.periodIndex && (lunchAfter > 0 ? (s.periodIndex <= lunchAfter) === isMorningDonor : true))
                .sort((a, b) => a.periodIndex - b.periodIndex);

              let canSlide = true;
              for (const tr of trailingDonor) {
                if (tr.isPinned) { canSlide = false; break; }
                const newP = tr.periodIndex - sDonor.span;
                if (newP - 1 >= 1 && !(lunchAfter > 0 && newP - 1 === lunchAfter)) {
                  const prevSec = facultySectionSlotMap.get(`faculty:${tr.facultyId}:${donorDay}:${newP - 1}`);
                  if (prevSec && prevSec !== secName) { canSlide = false; break; }
                }
              }
              if (!canSlide) continue;

              // Course limit on singleDay (max 1 per day)
              const cSingleDayCount = currentSingleDaySessions.filter((s) => s.courseId === sDonor.courseId).length;
              if (cSingleDayCount >= 1) continue;

              // Faculty daily limit on singleDay
              const facSingleDayCount = facultyPeriodCounts.get(`faculty:${sDonor.facultyId}:${singleDay}`) || 0;
              const facLimits = facultyCapMap.get(sDonor.facultyId) || { daily: 4, weekly: 18 };
              if (facSingleDayCount + 1 > facLimits.daily) continue;

              // Touching candidates on singleDay
              const isMorning = lunchAfter > 0 && sessToMove.periodIndex <= lunchAfter;
              const candidateStarts: number[] = [];
              const beforeStart = sessToMove.periodIndex - sDonor.span;
              const afterStart = sessToMove.periodIndex + sessToMove.span;

              if (isMorning) {
                if (beforeStart >= 1) candidateStarts.push(beforeStart);
                if (afterStart <= lunchAfter) candidateStarts.push(afterStart);
              } else {
                if (lunchAfter > 0 ? beforeStart > lunchAfter : beforeStart >= 1) candidateStarts.push(beforeStart);
                if (afterStart <= periodsCount) candidateStarts.push(afterStart);
              }

              for (const testPeriod of candidateStarts) {
                const testEnd = testPeriod + sDonor.span - 1;
                if (lunchAfter > 0 && testPeriod <= lunchAfter && testEnd > lunchAfter) continue;

                if (occupiedSlots.has(`section:${secName}:${singleDay}:${testPeriod}`)) continue;
                if (occupiedSlots.has(`faculty:${sDonor.facultyId}:${singleDay}:${testPeriod}`)) continue;

                const facTO3 = facTimeOffMap.get(sDonor.facultyId);
                if (facTO3 && facTO3[singleDay] && facTO3[singleDay][testPeriod - 1] === 0) continue;
                const sTO3 = sec.id ? secTimeOffMap.get(sec.id) : undefined;
                if (sTO3 && sTO3[singleDay] && sTO3[singleDay][testPeriod - 1] === 0) continue;

                let facAdjOk = true;
                if (testPeriod - 1 >= 1 && !(lunchAfter > 0 && testPeriod - 1 === lunchAfter)) {
                  const prevSec = facultySectionSlotMap.get(`faculty:${sDonor.facultyId}:${singleDay}:${testPeriod - 1}`);
                  if (prevSec && prevSec !== secName) facAdjOk = false;
                }
                if (testEnd + 1 <= periodsCount && !(lunchAfter > 0 && testEnd === lunchAfter)) {
                  const nextSec = facultySectionSlotMap.get(`faculty:${sDonor.facultyId}:${singleDay}:${testEnd + 1}`);
                  if (nextSec && nextSec !== secName) facAdjOk = false;
                }
                if (!facAdjOk) continue;

                // Max continuous run check on singleDay
                const sessionStart = lunchAfter > 0 && testPeriod > lunchAfter ? lunchAfter + 1 : 1;
                const sessionEnd = lunchAfter > 0 && testPeriod <= lunchAfter ? lunchAfter : periodsCount;
                let continuousRun = 1;
                for (let p = testPeriod - 1; p >= sessionStart; p--) {
                  if (occupiedSlots.has(`section:${secName}:${singleDay}:${p}`)) continuousRun++;
                  else break;
                }
                for (let p = testEnd + 1; p <= sessionEnd; p++) {
                  if (occupiedSlots.has(`section:${secName}:${singleDay}:${p}`)) continuousRun++;
                  else break;
                }
                if (continuousRun > 4) continue;

                // Faculty continuous teaching limit: max 2 hours
                let facContinuousRun = sDonor.span;
                for (let p = testPeriod - 1; p >= sessionStart; p--) {
                  if (occupiedSlots.has(`faculty:${sDonor.facultyId}:${singleDay}:${p}`)) facContinuousRun++;
                  else break;
                }
                for (let p = testEnd + 1; p <= sessionEnd; p++) {
                  if (occupiedSlots.has(`faculty:${sDonor.facultyId}:${singleDay}:${p}`)) facContinuousRun++;
                  else break;
                }
                if (facContinuousRun > 2) continue;

                let chosenRoomId = sDonor.roomId;
                let chosenRoomCode = sDonor.roomCode;
                let chosenRoomName = sDonor.roomName;

                if (!isTheoryRoomAvailable(chosenRoomId, singleDay, testPeriod)) {
                  const altRoom = getAvailableTheoryRoom(singleDay, testPeriod);
                  if (altRoom) {
                    chosenRoomId = altRoom.id;
                    chosenRoomCode = altRoom.code;
                    chosenRoomName = altRoom.name;
                  } else {
                    continue;
                  }
                }

                // 1. Remove sDonor from donorDay
                occupiedSlots.delete(`room:${sDonor.roomId}:${donorDay}:${sDonor.periodIndex}`);
                occupiedSlots.delete(`faculty:${sDonor.facultyId}:${donorDay}:${sDonor.periodIndex}`);
                occupiedSlots.delete(`section:${secName}:${donorDay}:${sDonor.periodIndex}`);
                facultySectionSlotMap.delete(`faculty:${sDonor.facultyId}:${donorDay}:${sDonor.periodIndex}`);
                sectionDayPeriods.get(`${secName}:${donorDay}`)?.delete(sDonor.periodIndex);
                facultyDayPeriods.get(`${sDonor.facultyId}:${donorDay}`)?.delete(sDonor.periodIndex);

                facultyPeriodCounts.set(`faculty:${sDonor.facultyId}:${donorDay}`, (facultyPeriodCounts.get(`faculty:${sDonor.facultyId}:${donorDay}`) || 1) - 1);
                facultyPeriodCounts.set(`faculty:${sDonor.facultyId}:${singleDay}`, (facultyPeriodCounts.get(`faculty:${sDonor.facultyId}:${singleDay}`) || 0) + 1);

                // 2. Slide trailing sessions on donorDay backwards by sDonor.span
                for (const tr of trailingDonor) {
                  for (let p = 0; p < tr.span; p++) {
                    const oldP = tr.periodIndex + p;
                    occupiedSlots.delete(`room:${tr.roomId}:${donorDay}:${oldP}`);
                    occupiedSlots.delete(`faculty:${tr.facultyId}:${donorDay}:${oldP}`);
                    occupiedSlots.delete(`section:${secName}:${donorDay}:${oldP}`);
                    facultySectionSlotMap.delete(`faculty:${tr.facultyId}:${donorDay}:${oldP}`);
                    sectionDayPeriods.get(`${secName}:${donorDay}`)?.delete(oldP);
                    facultyDayPeriods.get(`${tr.facultyId}:${donorDay}`)?.delete(oldP);
                  }
                  tr.periodIndex -= sDonor.span;
                  for (let p = 0; p < tr.span; p++) {
                    const newP = tr.periodIndex + p;
                    occupiedSlots.add(`room:${tr.roomId}:${donorDay}:${newP}`);
                    occupiedSlots.add(`faculty:${tr.facultyId}:${donorDay}:${newP}`);
                    occupiedSlots.add(`section:${secName}:${donorDay}:${newP}`);
                    facultySectionSlotMap.set(`faculty:${tr.facultyId}:${donorDay}:${newP}`, secName);
                    sectionDayPeriods.get(`${secName}:${donorDay}`)?.add(newP);
                    facultyDayPeriods.get(`${tr.facultyId}:${donorDay}`)?.add(newP);
                  }
                }

                // 3. Add sDonor to singleDay at testPeriod
                occupiedSlots.add(`room:${chosenRoomId}:${singleDay}:${testPeriod}`);
                occupiedSlots.add(`faculty:${sDonor.facultyId}:${singleDay}:${testPeriod}`);
                occupiedSlots.add(`section:${secName}:${singleDay}:${testPeriod}`);
                facultySectionSlotMap.set(`faculty:${sDonor.facultyId}:${singleDay}:${testPeriod}`, secName);
                if (!sectionDayPeriods.has(`${secName}:${singleDay}`)) sectionDayPeriods.set(`${secName}:${singleDay}`, new Set<number>());
                sectionDayPeriods.get(`${secName}:${singleDay}`)!.add(testPeriod);
                if (!facultyDayPeriods.has(`${sDonor.facultyId}:${singleDay}`)) facultyDayPeriods.set(`${sDonor.facultyId}:${singleDay}`, new Set<number>());
                facultyDayPeriods.get(`${sDonor.facultyId}:${singleDay}`)!.add(testPeriod);

                sDonor.day = singleDay;
                sDonor.periodIndex = testPeriod;
                sDonor.roomId = chosenRoomId;
                sDonor.roomCode = chosenRoomCode;
                sDonor.roomName = chosenRoomName;

                resolved = true;
                changed = true;
                break;
              }
            }
          }
        }
      }
    }

    if (!changed) break;
  }

  // =========================================================================
  // PHASE 2D: Lunch-Boundary Dead-Gap Resolver
  // Resolves sections with classes ending at P3 and resuming at P5 by moving
  // P3 session to P4 on another day that already ends at P3 cleanly
  // =========================================================================
  for (const sec of sectionsToSchedule) {
    const secName = (sec.department_code && !sec.name.toUpperCase().startsWith(sec.department_code.toUpperCase()))
      ? `${sec.department_code} - ${sec.name}`
      : sec.name;

    for (const day of activeDays) {
      const daySessions = placedSessions.filter((s) => s.sectionName === secName && s.day === day);
      const occupied = new Set<number>();
      for (const s of daySessions) {
        for (let p = 0; p < s.span; p++) occupied.add(s.periodIndex + p);
      }

      // Detect dead gap across lunch: has class at P3 and P5, but P4 is empty
      if (occupied.has(3) && occupied.has(5) && !occupied.has(4)) {
        const sAt3 = daySessions.find((s) => s.periodIndex === 3 && s.span === 1 && !s.isPinned);
        if (!sAt3) continue;

        for (const targetDay of activeDays) {
          if (targetDay === day) continue;

          const targetSessions = placedSessions.filter((s) => s.sectionName === secName && s.day === targetDay);
          const targetOccupied = new Set<number>();
          for (const s of targetSessions) {
            for (let p = 0; p < s.span; p++) targetOccupied.add(s.periodIndex + p);
          }

          if (targetOccupied.has(3) && !targetOccupied.has(4)) {
            if (occupiedSlots.has(`faculty:${sAt3.facultyId}:${targetDay}:4`)) continue;
            if (occupiedSlots.has(`section:${secName}:${targetDay}:4`)) continue;

            const facTO4 = facTimeOffMap.get(sAt3.facultyId);
            if (facTO4 && facTO4[targetDay] && facTO4[targetDay][3] === 0) continue;
            const sTO4 = sec.id ? secTimeOffMap.get(sec.id) : undefined;
            if (sTO4 && sTO4[targetDay] && sTO4[targetDay][3] === 0) continue;

            const facTargetCount = facultyPeriodCounts.get(`faculty:${sAt3.facultyId}:${targetDay}`) || 0;
            const facLimits = facultyCapMap.get(sAt3.facultyId) || { daily: 4, weekly: 18 };
            if (facTargetCount + 1 > facLimits.daily) continue;

            const cCount = targetSessions.filter((s) => s.courseId === sAt3.courseId).length;
            if (cCount >= 1) continue;

            let facAdjOk = true;
            const prevSec = facultySectionSlotMap.get(`faculty:${sAt3.facultyId}:${targetDay}:3`);
            if (prevSec && prevSec !== secName) facAdjOk = false;
            if (!facAdjOk) continue;

            // Check faculty continuous teaching limit: max 2 hours
            let fac4Run = 1;
            for (let p = 3; p >= 1; p--) {
              if (occupiedSlots.has(`faculty:${sAt3.facultyId}:${targetDay}:${p}`)) fac4Run++;
              else break;
            }
            if (fac4Run > 2) continue;

            let chosenRoomId = sAt3.roomId;
            let chosenRoomCode = sAt3.roomCode;
            let chosenRoomName = sAt3.roomName;

            if (!isTheoryRoomAvailable(chosenRoomId, targetDay, 4)) {
              const altRoom = getAvailableTheoryRoom(targetDay, 4);
              if (altRoom) {
                chosenRoomId = altRoom.id;
                chosenRoomCode = altRoom.code;
                chosenRoomName = altRoom.name;
              } else {
                continue;
              }
            }

            // Move sAt3 from day:3 to targetDay:4
            occupiedSlots.delete(`room:${sAt3.roomId}:${day}:3`);
            occupiedSlots.delete(`faculty:${sAt3.facultyId}:${day}:3`);
            occupiedSlots.delete(`section:${secName}:${day}:3`);
            facultySectionSlotMap.delete(`faculty:${sAt3.facultyId}:${day}:3`);
            sectionDayPeriods.get(`${secName}:${day}`)?.delete(3);
            facultyDayPeriods.get(`${sAt3.facultyId}:${day}`)?.delete(3);

            facultyPeriodCounts.set(`faculty:${sAt3.facultyId}:${day}`, (facultyPeriodCounts.get(`faculty:${sAt3.facultyId}:${day}`) || 1) - 1);
            facultyPeriodCounts.set(`faculty:${sAt3.facultyId}:${targetDay}`, (facultyPeriodCounts.get(`faculty:${sAt3.facultyId}:${targetDay}`) || 0) + 1);

            occupiedSlots.add(`room:${chosenRoomId}:${targetDay}:4`);
            occupiedSlots.add(`faculty:${sAt3.facultyId}:${targetDay}:4`);
            occupiedSlots.add(`section:${secName}:${targetDay}:4`);
            facultySectionSlotMap.set(`faculty:${sAt3.facultyId}:${targetDay}:4`, secName);
            if (!sectionDayPeriods.has(`${secName}:${targetDay}`)) sectionDayPeriods.set(`${secName}:${targetDay}`, new Set<number>());
            sectionDayPeriods.get(`${secName}:${targetDay}`)!.add(4);
            if (!facultyDayPeriods.has(`${sAt3.facultyId}:${targetDay}`)) facultyDayPeriods.set(`${sAt3.facultyId}:${targetDay}`, new Set<number>());
            facultyDayPeriods.get(`${sAt3.facultyId}:${targetDay}`)!.add(4);

            sAt3.day = targetDay;
            sAt3.periodIndex = 4;
            sAt3.roomId = chosenRoomId;
            sAt3.roomCode = chosenRoomCode;
            sAt3.roomName = chosenRoomName;

            break;
          }
        }
      }
    }
  }

  // =========================================================================
  // Relief & Compactness Quality Metrics
  // =========================================================================
  let singleHourDaysCount = 0;
  let isolatedGapsCount = 0;
  let reliefDaysCount = 0;
  let contiguousBlocksCount = 0;

  for (const sec of sectionsToSchedule) {
    const secName = (sec.department_code && !sec.name.toUpperCase().startsWith(sec.department_code.toUpperCase()))
      ? `${sec.department_code} - ${sec.name}`
      : sec.name;

    for (const day of activeDays) {
      const secSessions = placedSessions
        .filter((s) => s.sectionName === secName && s.day === day)
        .sort((a, b) => a.periodIndex - b.periodIndex);

      const totalHrs = secSessions.reduce((acc, s) => acc + s.span, 0);
      if (totalHrs === 0) {
        reliefDaysCount++;
      } else if (totalHrs === 1) {
        singleHourDaysCount++;
      } else if (totalHrs >= 2) {
        contiguousBlocksCount++;
      }

      const occupied = new Set<number>();
      for (const s of secSessions) {
        for (let p = 0; p < s.span; p++) occupied.add(s.periodIndex + p);
      }
      const sortedPeriods = Array.from(occupied).sort((a, b) => a - b);
      for (let i = 0; i < sortedPeriods.length - 1; i++) {
        if (sortedPeriods[i + 1] - sortedPeriods[i] === 2) {
          const gapPeriod = sortedPeriods[i] + 1;
          const crossesLunch = lunchAfter > 0 && sortedPeriods[i] <= lunchAfter && sortedPeriods[i + 1] > lunchAfter;
          if (crossesLunch) {
            if (sortedPeriods[i] === lunchAfter && sortedPeriods[i + 1] === lunchAfter + 1) {
              // Standard lunch recess
            } else {
              isolatedGapsCount++;
            }
          } else {
            isolatedGapsCount++;
          }
        }
      }
    }
  }

  // 6. Write atomically to the database in a SQL Transaction
  await transaction(async (tx) => {
    if (options.clearUnpinned !== false) {
      await tx.execute('DELETE FROM class_sessions WHERE is_pinned = 0');
    }

    if (placedSessions.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < placedSessions.length; i += batchSize) {
        const chunk = placedSessions.slice(i, i + batchSize);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').join(', ');
        const values: unknown[] = [];
        for (const sess of chunk) {
          values.push(
            sess.id,
            sess.day,
            sess.periodIndex,
            sess.span,
            sess.courseId,
            sess.facultyId,
            sess.roomId,
            sess.sectionName,
            sess.batch || 'ALL'
          );
        }
        await tx.execute(
          `INSERT INTO class_sessions (id, day, period_index, span, course_id, faculty_id, room_id, section_name, batch, is_pinned)
           VALUES ${placeholders}`,
          values
        );
      }
    }
  });

  const durationMs = Date.now() - startTime;
  const placementRate = Math.round((placedSessions.length / (demands.length || 1)) * 100);

  return {
    success: unplacedDemands.length === 0,
    totalDemanded: demands.length,
    placedCount: placedSessions.length,
    unplacedCount: unplacedDemands.length,
    unplacedDemands,
    durationMs,
    placementRate,
    singleHourDaysCount,
    isolatedGapsCount,
    contiguousBlocksCount,
    reliefDaysCount,
  };
}

export async function testTimetableFeasibility(options: { daysCount?: 5 | 6; periodsCount?: number } = {}): Promise<{
  feasible: boolean;
  warnings: string[];
  bottlenecks: string[];
  metrics: {
    totalDemandsCount: number;
    totalFacultyCount: number;
    totalRoomsCount: number;
    weeklyTheoryHoursAvailable: number;
    weeklyLabHoursAvailable: number;
  };
}> {
  const daysCount = options.daysCount || 5;
  const periodsCount = options.periodsCount || 8;
  const warnings: string[] = [];
  const bottlenecks: string[] = [];

  const rooms = await query<{ id: string; code: string; name: string; type: string; capacity: number }>(
    'SELECT id, code, name, type, capacity FROM rooms WHERE is_available = 1'
  );
  const faculty = await query<{ id: string; code: string; name: string; max_weekly_periods: number }>(
    'SELECT id, code, name, max_weekly_periods FROM faculty'
  );
  const assignments = await query<{
    section_id: string;
    course_id: string;
    faculty_id: string;
    periods_per_week: number;
    span: number;
    course_code: string;
    faculty_name: string;
  }>(`
    SELECT ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week,
           c.span, c.code AS course_code, f.name AS faculty_name
    FROM teaching_assignments ta
    JOIN courses c ON c.id = ta.course_id
    JOIN faculty f ON f.id = ta.faculty_id
  `);

  const theoryRooms = rooms.filter((r) => r.type === 'LECTURE_HALL' || r.type === 'CLASSROOM' || r.type === 'SEMINAR_HALL');
  const labRooms = rooms.filter((r) => r.type === 'COMPUTER_LAB');

  const weeklyTheoryHoursAvailable = theoryRooms.length * daysCount * periodsCount;
  const weeklyLabHoursAvailable = labRooms.length * daysCount * periodsCount;

  let totalDemandedTheory = 0;
  let totalDemandedLab = 0;
  const facultyAssigned = new Map<string, number>();

  for (const a of assignments) {
    const hrs = Number(a.periods_per_week) || 3;
    if (a.span > 1) {
      totalDemandedLab += hrs;
    } else {
      totalDemandedTheory += hrs;
    }
    facultyAssigned.set(a.faculty_id, (facultyAssigned.get(a.faculty_id) || 0) + hrs);
  }

  if (totalDemandedTheory > weeklyTheoryHoursAvailable) {
    bottlenecks.push(`Theory capacity deficit: Demanded ${totalDemandedTheory}h > Available ${weeklyTheoryHoursAvailable}h.`);
  }
  if (totalDemandedLab > weeklyLabHoursAvailable) {
    bottlenecks.push(`Lab capacity deficit: Demanded ${totalDemandedLab}h > Available ${weeklyLabHoursAvailable}h.`);
  }

  for (const f of faculty) {
    const assigned = facultyAssigned.get(f.id) || 0;
    if (assigned > f.max_weekly_periods) {
      warnings.push(`Faculty ${f.name} assigned ${assigned}h (exceeds weekly limit of ${f.max_weekly_periods}h).`);
    }
  }

  return {
    feasible: bottlenecks.length === 0,
    warnings,
    bottlenecks,
    metrics: {
      totalDemandsCount: assignments.length,
      totalFacultyCount: faculty.length,
      totalRoomsCount: rooms.length,
      weeklyTheoryHoursAvailable,
      weeklyLabHoursAvailable,
    },
  };
}
