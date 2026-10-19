import { query, transaction } from './db';

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
}

export async function runSchedulerSolver(options: {
  daysCount?: 5 | 6;
  clearUnpinned?: boolean;
  periodsCount?: number;
  lunchAfterPeriod?: number;
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
  }>('SELECT id, code, name, type, capacity, is_available, department_id FROM rooms WHERE is_available = 1 ORDER BY capacity DESC');

  if (rooms.length === 0) {
    throw new Error('No active rooms available in the database.');
  }

  // 2. Fetch faculty and their limits
  const facultyList = await query<{
    id: string;
    code: string;
    name: string;
    max_daily_periods: number;
    max_weekly_periods: number;
  }>('SELECT id, code, name, max_daily_periods, max_weekly_periods FROM faculty');

  const facultyCapMap = new Map<string, { daily: number; weekly: number }>();
  for (const f of facultyList) {
    facultyCapMap.set(f.id, {
      daily: f.max_daily_periods,
      weekly: f.max_weekly_periods,
    });
  }

  // 3. Fetch courses
  const courses = await query<{
    id: string;
    code: string;
    name: string;
    department_id: string;
    periods_per_week: number;
    span: number;
  }>('SELECT id, code, name, department_id, periods_per_week, span FROM courses');

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

  // Student section workload tracking:
  // 1. Total class/lab hours per day: `section:${sectionName}:${day}:total_hours` (Max 7 hours)
  // 2. Total theory teaching hours per day: `section:${sectionName}:${day}:teaching_hours` (Max 5 hours)
  const sectionDayTotalHours = new Map<string, number>();
  const sectionDayTeachingHours = new Map<string, number>();

  // Section & Course per day to spread evenly
  const courseDayCount = new Map<string, number>(); // `course:${courseId}:${day}`

  // Register pinned sessions
  for (const ps of existingPinned) {
    for (let p = 0; p < ps.span; p++) {
      const pIdx = ps.period_index + p;
      occupiedSlots.add(`room:${ps.room_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`faculty:${ps.faculty_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`section:${ps.section_name}:${ps.day}:${pIdx}`);
      facultySectionSlotMap.set(`faculty:${ps.faculty_id}:${ps.day}:${pIdx}`, ps.section_name);

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

  // Fetch sections from database with department codes
  const dbSections = await query<{ id: string; name: string; department_id: string; semester: number; department_code?: string }>(
    `SELECT s.id, s.name, s.department_id, s.semester, d.code as department_code
     FROM sections s
     LEFT JOIN departments d ON d.id = s.department_id
     ORDER BY d.code ASC, s.name ASC`
  );

  // Fetch all existing teaching assignments
  const teachingAssignments = await query<{
    section_id: string;
    course_id: string;
    faculty_id: string;
    periods_per_week: number;
    course_code: string;
    course_name: string;
    course_span: number;
    faculty_name: string;
    faculty_code: string;
  }>(`
    SELECT ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week,
           c.code as course_code, c.name as course_name, c.span as course_span,
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

      const sessionsNeeded = Math.ceil(periods / span);
      for (let i = 0; i < sessionsNeeded; i++) {
        demands.push({
          sectionId: sec.id,
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          facultyId: facId,
          facultyName: facName,
          facultyCode: facCode,
          sectionName: sectionDisplayName,
          span,
          preferredRoomType: span > 1 ? 'COMPUTER_LAB' : 'LECTURE_HALL',
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

  // Heuristic sort: place multi-span labs first (most constrained), then by periodsPerWeek
  demands.sort((a, b) => b.span - a.span || b.periodsPerWeek - a.periodsPerWeek);

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

  // Solver Iteration
  for (const demand of demands) {
    let placed = false;
    let failureReason = 'No clash-free slot found across all days and periods';

    const possibleStarts = getPossiblePeriodStarts(demand.span);

    // Filter candidate rooms: preferred type first, then other suitable rooms
    const preferred = rooms.filter((r) => r.type === demand.preferredRoomType);
    const secondary = rooms.filter((r) => r.type !== demand.preferredRoomType);
    let candidateRooms = [...preferred, ...secondary];

    // Home Classroom Affinity constraint:
    // If this is a theory/regular class (span === 1 or preferred LECTURE_HALL/CLASSROOM),
    // prioritize the section's dedicated Home Classroom at the top of candidateRooms!
    const homeRoomId = sectionHomeRoomMap.get(demand.sectionName);
    if (homeRoomId && demand.preferredRoomType !== 'COMPUTER_LAB') {
      candidateRooms.sort((a, b) => {
        if (a.id === homeRoomId && b.id !== homeRoomId) return -1;
        if (b.id === homeRoomId && a.id !== homeRoomId) return 1;
        const aPref = a.type === demand.preferredRoomType ? 1 : 0;
        const bPref = b.type === demand.preferredRoomType ? 1 : 0;
        return bPref - aPref;
      });
    }

    // Invariant: For a faculty don't assign adjacent classes in diff sections
    // Pass 1: Strict mode (allowAdjacentDiffSections = false) ensures zero back-to-back classes in different sections
    // Pass 2: Fallback mode only if physically impossible otherwise
    for (const allowAdjacentDiffSections of [false, true]) {
      if (placed) break;

      // Try placing with soft constraint (1 per day), then fallback to 2 per day if needed
      for (const maxPerDay of [1, 2]) {
        if (placed) break;

        for (const day of activeDays) {
          if (placed) break;

          // Soft optimization: try to spread course across different days
          const cDayKey = `course:${demand.courseId}:${demand.sectionName}:${day}`;
          if ((courseDayCount.get(cDayKey) || 0) >= maxPerDay) {
            continue;
          }

        for (const startPeriod of possibleStarts) {
          if (placed) break;

          // Check if faculty daily cap will be exceeded
          const facDayKey = `faculty:${demand.facultyId}:${day}`;
          const currentDaily = facultyPeriodCounts.get(facDayKey) || 0;
          const facLimits = facultyCapMap.get(demand.facultyId) || { daily: 4, weekly: 18 };

          if (currentDaily + demand.span > facLimits.daily) {
            failureReason = `Faculty ${demand.facultyCode} daily period limit (${facLimits.daily}) reached for ${day}`;
            continue;
          }

          // Check weekly cap
          const facWeekKey = `faculty:${demand.facultyId}:week`;
          const currentWeekly = facultyPeriodCounts.get(facWeekKey) || 0;
          if (currentWeekly + demand.span > facLimits.weekly) {
            failureReason = `Faculty ${demand.facultyCode} weekly period limit (${facLimits.weekly}) reached`;
            continue;
          }

          // Check Section Availability for all periods in span
          let sectionBusy = false;
          for (let s = 0; s < demand.span; s++) {
            if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${startPeriod + s}`)) {
              sectionBusy = true;
              break;
            }
          }
          if (sectionBusy) {
            failureReason = `Section ${demand.sectionName} already attending another class`;
            continue;
          }

          // Student Constraint 1: Max 7 hours of classes/lab in 1 day for a section
          const secTotalKey = `section:${demand.sectionName}:${day}:total_hours`;
          const currentSectionDailyTotal = sectionDayTotalHours.get(secTotalKey) || 0;
          if (currentSectionDailyTotal + demand.span > 7) {
            failureReason = `Section ${demand.sectionName} daily total class/lab limit (max 7 hours) reached for ${day}`;
            continue;
          }

          // Student Constraint 2: Max 5 hours of teaching (theory) class in 1 day for a section
          const secTeachKey = `section:${demand.sectionName}:${day}:teaching_hours`;
          const currentSectionTeachingHours = sectionDayTeachingHours.get(secTeachKey) || 0;
          const isTeaching = demand.span === 1;
          if (isTeaching && currentSectionTeachingHours + 1 > 5) {
            failureReason = `Section ${demand.sectionName} daily teaching class limit (max 5 hours) reached for ${day}`;
            continue;
          }

          // Student Constraint 3: Max 4 hours continuous classes or lab in 1 session (before or after lunch)
          const sessionStart = lunchAfter > 0 && startPeriod > lunchAfter ? lunchAfter + 1 : 1;
          const sessionEnd = lunchAfter > 0 && startPeriod <= lunchAfter ? lunchAfter : periodsCount;

          let runBefore = 0;
          for (let p = startPeriod - 1; p >= sessionStart; p--) {
            if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${p}`)) {
              runBefore++;
            } else {
              break;
            }
          }

          let runAfter = 0;
          for (let p = startPeriod + demand.span; p <= sessionEnd; p++) {
            if (occupiedSlots.has(`section:${demand.sectionName}:${day}:${p}`)) {
              runAfter++;
            } else {
              break;
            }
          }

          const totalContinuous = runBefore + demand.span + runAfter;
          if (totalContinuous > 4) {
            failureReason = `Section ${demand.sectionName} exceeds 4 continuous hours in 1 session (${totalContinuous} hrs)`;
            continue;
          }

          // Check Faculty Availability for all periods in span
          let facultyBusy = false;
          for (let s = 0; s < demand.span; s++) {
            if (occupiedSlots.has(`faculty:${demand.facultyId}:${day}:${startPeriod + s}`)) {
              facultyBusy = true;
              break;
            }
          }
          if (facultyBusy) {
            failureReason = `Faculty ${demand.facultyCode} already teaching at period ${startPeriod}`;
            continue;
          }

          // Invariant: "For a faculty don't assign adjacent classes in diff sections"
          // Unless separated by a lunch break, a teacher must not have back-to-back classes with different sections.
          let hasAdjacentDiffSection = false;

          const pPrev = startPeriod - 1;
          if (pPrev >= 1) {
            const isLunchBuffer = lunchAfter > 0 && pPrev === lunchAfter;
            if (!isLunchBuffer) {
              const prevSection = facultySectionSlotMap.get(`faculty:${demand.facultyId}:${day}:${pPrev}`);
              if (prevSection && prevSection !== demand.sectionName) {
                hasAdjacentDiffSection = true;
              }
            }
          }

          const pNext = startPeriod + demand.span;
          if (pNext <= periodsCount) {
            const isLunchBuffer = lunchAfter > 0 && (startPeriod + demand.span - 1) === lunchAfter;
            if (!isLunchBuffer) {
              const nextSection = facultySectionSlotMap.get(`faculty:${demand.facultyId}:${day}:${pNext}`);
              if (nextSection && nextSection !== demand.sectionName) {
                hasAdjacentDiffSection = true;
              }
            }
          }

          if (hasAdjacentDiffSection && !allowAdjacentDiffSections) {
            failureReason = `Faculty ${demand.facultyCode} has an adjacent class in a different section around period ${startPeriod}`;
            continue;
          }

          // Search for a free room
          for (const room of candidateRooms) {
            let roomBusy = false;
            for (let s = 0; s < demand.span; s++) {
              if (occupiedSlots.has(`room:${room.id}:${day}:${startPeriod + s}`)) {
                roomBusy = true;
                break;
              }
            }

            if (!roomBusy) {
              // Found a valid clash-free slot!
              // 1. Commit slot in occupied tracker
              for (let s = 0; s < demand.span; s++) {
                const pIdx = startPeriod + s;
                occupiedSlots.add(`room:${room.id}:${day}:${pIdx}`);
                occupiedSlots.add(`faculty:${demand.facultyId}:${day}:${pIdx}`);
                occupiedSlots.add(`section:${demand.sectionName}:${day}:${pIdx}`);
                facultySectionSlotMap.set(`faculty:${demand.facultyId}:${day}:${pIdx}`, demand.sectionName);
              }

              // 2. Increment faculty period counts
              facultyPeriodCounts.set(facDayKey, currentDaily + demand.span);
              facultyPeriodCounts.set(facWeekKey, currentWeekly + demand.span);

              // 2b. Increment student section daily loads
              sectionDayTotalHours.set(secTotalKey, currentSectionDailyTotal + demand.span);
              if (isTeaching) {
                sectionDayTeachingHours.set(secTeachKey, currentSectionTeachingHours + 1);
              }

              // 3. Mark course scheduled for this day
              courseDayCount.set(cDayKey, (courseDayCount.get(cDayKey) || 0) + 1);

              // 4. Save placement
              placedSessions.push({
                id: 'sess_' + Math.random().toString(36).substring(2, 10),
                day,
                periodIndex: startPeriod,
                span: demand.span,
                courseId: demand.courseId,
                courseCode: demand.courseCode,
                courseName: demand.courseName,
                facultyId: demand.facultyId,
                facultyName: demand.facultyName,
                roomId: room.id,
                roomCode: room.code,
                roomName: room.name,
                sectionName: demand.sectionName,
                isPinned: false,
              });

              placed = true;
              break;
            }
          }
        }
      }
    }
  }

    if (!placed) {
      unplacedDemands.push({ demand, reason: failureReason });
    }
  }

  // 6. Write atomically to the database in a SQL Transaction
  await transaction(async (tx) => {
    if (options.clearUnpinned !== false) {
      await tx.execute('DELETE FROM class_sessions WHERE is_pinned = 0');
    }

    for (const sess of placedSessions) {
      await tx.execute(
        `INSERT INTO class_sessions (id, day, period_index, span, course_id, faculty_id, room_id, section_name, is_pinned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          sess.id,
          sess.day,
          sess.periodIndex,
          sess.span,
          sess.courseId,
          sess.facultyId,
          sess.roomId,
          sess.sectionName,
        ]
      );
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
  };
}
