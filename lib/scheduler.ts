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
  const periodsCount = Math.min(12, Math.max(6, options.periodsCount || 9));
  const lunchAfter = options.lunchAfterPeriod !== undefined ? options.lunchAfterPeriod : 5;
  const activeDays = ALL_DAYS.slice(0, daysCount);

  // 1. Fetch available rooms
  const rooms = await query<{
    id: string;
    code: string;
    name: string;
    type: string;
    capacity: number;
    is_available: number | boolean;
  }>('SELECT id, code, name, type, capacity, is_available FROM rooms WHERE is_available = 1 ORDER BY capacity DESC');

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

  // Faculty periods count: `faculty:${facultyId}:${day}` and `faculty:${facultyId}:week`
  const facultyPeriodCounts = new Map<string, number>();

  // Section & Course per day to spread evenly
  const courseDayCount = new Map<string, number>(); // `course:${courseId}:${day}`

  // Register pinned sessions
  for (const ps of existingPinned) {
    for (let p = 0; p < ps.span; p++) {
      const pIdx = ps.period_index + p;
      occupiedSlots.add(`room:${ps.room_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`faculty:${ps.faculty_id}:${ps.day}:${pIdx}`);
      occupiedSlots.add(`section:${ps.section_name}:${ps.day}:${pIdx}`);

      // Count faculty periods
      const dayKey = `faculty:${ps.faculty_id}:${ps.day}`;
      const weekKey = `faculty:${ps.faculty_id}:week`;
      facultyPeriodCounts.set(dayKey, (facultyPeriodCounts.get(dayKey) || 0) + 1);
      facultyPeriodCounts.set(weekKey, (facultyPeriodCounts.get(weekKey) || 0) + 1);
    }
  }

  // 5. Generate Demands
  // We schedule for default sections: e.g. "Section A" and "Section B"
  const sections = ['Section A', 'Section B'];
  const demands: ScheduleDemand[] = [];

  for (const sec of sections) {
    for (const c of courses) {
      // Find suitable instructor for course
      const suitableFac =
        facultyByDept.find((f) => f.department_id === c.department_id) || facultyByDept[0];

      if (!suitableFac) continue;

      const sessionsNeeded = Math.ceil(c.periods_per_week / c.span);
      for (let i = 0; i < sessionsNeeded; i++) {
        demands.push({
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          facultyId: suitableFac.id,
          facultyName: suitableFac.name,
          facultyCode: suitableFac.code,
          sectionName: sec,
          span: c.span,
          preferredRoomType: c.span > 1 ? 'COMPUTER_LAB' : 'LECTURE_HALL',
          periodsPerWeek: c.periods_per_week,
        });
      }
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

    // Filter candidate rooms based on demand type
    let candidateRooms = rooms.filter((r) => r.type === demand.preferredRoomType);
    if (candidateRooms.length === 0) {
      // Fallback to any room with capacity >= 20
      candidateRooms = rooms.filter((r) => r.capacity >= 20);
    }

    // Try days, spread out
    for (const day of activeDays) {
      if (placed) break;

      // Soft optimization: don't schedule more than 1 session of the same course on the same day for a section
      const cDayKey = `course:${demand.courseId}:${demand.sectionName}:${day}`;
      if ((courseDayCount.get(cDayKey) || 0) >= 1) {
        continue; // Try another day first to spread lectures
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
            }

            // 2. Increment faculty period counts
            facultyPeriodCounts.set(facDayKey, currentDaily + demand.span);
            facultyPeriodCounts.set(facWeekKey, currentWeekly + demand.span);

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
