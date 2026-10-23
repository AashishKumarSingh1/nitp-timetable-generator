import { query, queryOne, execute } from '../lib/db';
import { runSchedulerSolver } from '../lib/scheduler';
import { generateAntiCheatingSeating } from '../lib/seating-engine';

async function runVerification() {
  console.log('🚀 Running Comprehensive Acceptance Verification Suite...\n');

  // Test 1: Pure SQL Database Layer
  console.log('1️⃣ Checking Database Tables & Connections...');
  const usersCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const deptCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM departments');
  const roomCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM rooms');
  const facCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM faculty');
  const stuCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM students');

  console.log(`   - Users in DB: ${usersCount?.count}`);
  console.log(`   - Departments: ${deptCount?.count}`);
  console.log(`   - Rooms: ${roomCount?.count}`);
  console.log(`   - Faculty Members: ${facCount?.count}`);
  console.log(`   - Students for Seating: ${stuCount?.count}`);
  if (!deptCount?.count || !roomCount?.count || !facCount?.count) {
    throw new Error('Database missing essential starter entities.');
  }
  console.log('   ✅ Pure SQL Database Layer: PASSED\n');

  // Test 2: Classroom Timetable Deterministic Solver Invariant
  console.log('2️⃣ Running Constraint-Satisfaction Timetable Solver...');
  const solverRes = await runSchedulerSolver({ daysCount: 5, clearUnpinned: true });
  console.log(`   - Solver placed ${solverRes.placedCount} of ${solverRes.totalDemanded} demands in ${solverRes.durationMs}ms`);
  console.log(`   - Placement Rate: ${solverRes.placementRate}%`);

  // Physical collision checks in DB
  const roomCollisions = await query<{ count: number }>(`
    SELECT COUNT(*) as count FROM (
      SELECT room_id, day, period_index, COUNT(*) as c
      FROM class_sessions
      GROUP BY room_id, day, period_index
      HAVING COUNT(*) > 1
    )
  `);

  const facultyCollisions = await query<{ count: number }>(`
    SELECT COUNT(*) as count FROM (
      SELECT faculty_id, day, period_index, COUNT(*) as c
      FROM class_sessions
      GROUP BY faculty_id, day, period_index
      HAVING COUNT(*) > 1
    )
  `);

  const roomClashes = roomCollisions[0]?.count || 0;
  const facultyClashes = facultyCollisions[0]?.count || 0;
  console.log(`   - Room Collisions: ${roomClashes}`);
  console.log(`   - Faculty Collisions: ${facultyClashes}`);

  if (roomClashes > 0 || facultyClashes > 0) {
    throw new Error(`Collision Invariant Failed! Room clashes: ${roomClashes}, Faculty clashes: ${facultyClashes}`);
  }
  console.log('   ✅ Collision-Free Invariant: 100% VERIFIED');

  // Verify Invariant: "For a faculty don't assign adjacent classes in diff sections"
  console.log('   - Verifying No-Adjacent-Diff-Sections Invariant for Faculty...');
  const allSessions = await query<{
    faculty_id: string;
    faculty_name: string;
    day: string;
    period_index: number;
    span: number;
    section_name: string;
    room_id: string;
  }>(`
    SELECT cs.faculty_id, f.name as faculty_name, cs.day, cs.period_index, cs.span, cs.section_name, cs.room_id
    FROM class_sessions cs
    JOIN faculty f ON f.id = cs.faculty_id
    ORDER BY cs.faculty_id, cs.day, cs.period_index
  `);

  let adjacentDiffSectionClashes = 0;
  for (let i = 0; i < allSessions.length; i++) {
    for (let j = i + 1; j < allSessions.length; j++) {
      const s1 = allSessions[i];
      const s2 = allSessions[j];
      if (s1.faculty_id !== s2.faculty_id || s1.day !== s2.day) break;
      if (s1.period_index + s1.span === s2.period_index) {
        // Exclude lunch break separation (period 4 lunch recess)
        if (s1.period_index + s1.span - 1 === 4) continue;
        if (s1.section_name !== s2.section_name) {
          console.error(`   ❌ Adjacent Diff Section Clash: ${s1.faculty_name} on ${s1.day} P${s1.period_index}(${s1.section_name}) -> P${s2.period_index}(${s2.section_name})`);
          adjacentDiffSectionClashes++;
        }
      }
    }
  }

  console.log(`   - Adjacent Different-Section Faculty Clashes: ${adjacentDiffSectionClashes}`);
  if (adjacentDiffSectionClashes > 0) {
    throw new Error(`Adjacent Section Invariant Failed! ${adjacentDiffSectionClashes} back-to-back cross-section clashes found.`);
  }
  console.log('   ✅ No-Adjacent-Diff-Sections Invariant: 100% VERIFIED');

  // Verify Student Constraints:
  // 1. No more than 4hour continuous classes or lab in 1 session (before or after lunch)
  // 2. No more than 5 hour of teaching class in 1 day
  // 3. No more than 7 hour of classes/lab in 1 day
  // 4. Zero classes crossing or assigned in lunch recess
  console.log('   - Verifying Student Workload & Session Invariants...');

  const sectionDaySessions = new Map<string, typeof allSessions>();
  for (const s of allSessions) {
    const key = `${s.section_name}:${s.day}`;
    if (!sectionDaySessions.has(key)) sectionDaySessions.set(key, []);
    sectionDaySessions.get(key)!.push(s);
  }

  let studentContinuousViolations = 0;
  let studentTeachingHoursViolations = 0;
  let studentDailyTotalViolations = 0;
  let lunchRecessViolations = 0;

  for (const [key, sessList] of sectionDaySessions.entries()) {
    let totalHours = 0;
    let teachingHours = 0;
    const occupiedPeriods = new Set<number>();

    for (const s of sessList) {
      totalHours += s.span;
      if (s.span === 1) teachingHours += 1;

      // Check lunch crossing (lunch after period 4)
      const pStart = s.period_index;
      const pEnd = s.period_index + s.span - 1;
      if (pStart <= 4 && pEnd > 4) {
        console.error(`   ❌ Lunch Recess Violation: ${s.section_name} on ${s.day} session spans P${pStart}-P${pEnd} crossing lunch!`);
        lunchRecessViolations++;
      }

      for (let p = 0; p < s.span; p++) {
        occupiedPeriods.add(s.period_index + p);
      }
    }

    // Constraint 1: Max 7 hours classes/labs in 1 day
    if (totalHours > 7) {
      console.error(`   ❌ Student Daily Total Limit Violated: ${key} has ${totalHours} hours (Max 7)`);
      studentDailyTotalViolations++;
    }

    // Constraint 2: Max 5 hours teaching (theory) class in 1 day
    if (teachingHours > 5) {
      console.error(`   ❌ Student Teaching Hours Limit Violated: ${key} has ${teachingHours} theory hours (Max 5)`);
      studentTeachingHoursViolations++;
    }

    // Constraint 3: Max 4 hours continuous in 1 session (before lunch: 1..4, after lunch: 5..8+)
    // Morning session:
    let morningStreak = 0;
    for (let p = 1; p <= 4; p++) {
      if (occupiedPeriods.has(p)) {
        morningStreak++;
        if (morningStreak > 4) {
          console.error(`   ❌ Continuous Hours Limit Violated in Morning: ${key} streak=${morningStreak}`);
          studentContinuousViolations++;
        }
      } else {
        morningStreak = 0;
      }
    }

    // Afternoon session:
    let afternoonStreak = 0;
    for (let p = 5; p <= 12; p++) {
      if (occupiedPeriods.has(p)) {
        afternoonStreak++;
        if (afternoonStreak > 4) {
          console.error(`   ❌ Continuous Hours Limit Violated in Afternoon: ${key} streak=${afternoonStreak}`);
          studentContinuousViolations++;
        }
      } else {
        afternoonStreak = 0;
      }
    }
  }

  console.log(`   - Student Daily Total Violations (>7h): ${studentDailyTotalViolations}`);
  console.log(`   - Student Theory Teaching Violations (>5h): ${studentTeachingHoursViolations}`);
  console.log(`   - Student Continuous Session Violations (>4h): ${studentContinuousViolations}`);
  console.log(`   - Lunch Recess Crossing Violations: ${lunchRecessViolations}`);

  if (studentDailyTotalViolations > 0 || studentTeachingHoursViolations > 0 || studentContinuousViolations > 0 || lunchRecessViolations > 0) {
    throw new Error('Student Workload / Recess Invariants Failed!');
  }
  console.log('   ✅ Student Workload & Session Invariants: 100% VERIFIED');

  // Verify Student Relief Invariants:
  // 1. Zero isolated 1-hour dead gaps within sessions
  // 2. Zero single-class days (at least 2-3 hours continuous per class day)
  console.log('   - Verifying Student Relief & Anti-Gap Invariants...');
  let isolatedGapsFound = 0;
  let singleHourDaysFound = 0;

  for (const [key, sessList] of sectionDaySessions.entries()) {
    const totalHours = sessList.reduce((acc, s) => acc + s.span, 0);
    if (totalHours === 1) {
      console.error(`   ❌ Single-Class Day Violation: ${key} has only 1 hour!`);
      singleHourDaysFound++;
    }

    const occupiedPeriods = new Set<number>();
    for (const s of sessList) {
      for (let p = 0; p < s.span; p++) occupiedPeriods.add(s.period_index + p);
    }
    const sorted = Array.from(occupiedPeriods).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] === 2) {
        // Gap of 1 period
        // Check if lunch separates them cleanly (e.g. sorted[i] === 4 and sorted[i+1] === 5)
        if (sorted[i] === 4 && sorted[i + 1] === 5) {
          // Normal lunch recess
        } else {
          console.error(`   ❌ Isolated 1-Hour Dead Gap: ${key} has empty P${sorted[i] + 1} between P${sorted[i]} and P${sorted[i + 1]}`);
          isolatedGapsFound++;
        }
      }
    }
  }

  console.log(`   - Isolated 1-Hour Gaps: ${isolatedGapsFound}`);
  console.log(`   - Single-Class Days (<2h): ${singleHourDaysFound}`);
  if (isolatedGapsFound > 0 || singleHourDaysFound > 0) {
    throw new Error(`Student Relief Invariants Failed! Gaps: ${isolatedGapsFound}, Single-hour days: ${singleHourDaysFound}`);
  }
  console.log('   ✅ Student Relief & Anti-Gap Invariants: 100% VERIFIED\n');

  // Test 3: Anti-Cheating Seating Engine Checkerboard Invariant
  console.log('3️⃣ Running Anti-Cheating Seating Interleaving Algorithm...');
  let exam = await queryOne<{ id: string }>('SELECT id FROM exam_schedules LIMIT 1');
  if (!exam) {
    const examId = 'exam_midterm_2026';
    await execute('INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)', [
      examId,
      'Mid-Term Examinations Autumn 2026',
      '2026-10-25',
      'Morning (09:30-12:30)',
    ]);
    exam = { id: examId };
  }
  const room = await queryOne<{ id: string; rows: number; cols: number }>('SELECT id, rows, cols FROM rooms WHERE code = ?', ['LH-101']);
  const cseDept = await queryOne<{ id: string }>('SELECT id FROM departments WHERE code = ?', ['CSE']);
  const eceDept = await queryOne<{ id: string }>('SELECT id FROM departments WHERE code = ?', ['ECE']);

  if (!exam || !room || !cseDept || !eceDept) {
    throw new Error('Missing test entities for seating verification');
  }

  const seatingRes = await generateAntiCheatingSeating({
    examScheduleId: exam.id,
    roomId: room.id,
    departmentAId: cseDept.id,
    departmentBId: eceDept.id,
    clearExisting: true,
  });

  console.log(`   - Total Room Capacity: ${seatingRes.totalSeatsInRoom}`);
  console.log(`   - Allocated Students: ${seatingRes.totalAllocated}`);
  console.log(`   - Overflow Students: ${seatingRes.overflowStudents.length}`);
  console.log(`   - Zero Adjacent Collisions Verified: ${seatingRes.zeroAdjacentCollisionsVerified}`);

  if (!seatingRes.zeroAdjacentCollisionsVerified) {
    throw new Error('Anti-cheating algorithm produced adjacent peers!');
  }
  console.log('   ✅ Anti-Cheating Invariant: 100% VERIFIED\n');

  console.log('🎉 ALL SYSTEM ACCEPTANCE CHECKS PASSED WITH 100% SUCCESS!');
}

runVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
