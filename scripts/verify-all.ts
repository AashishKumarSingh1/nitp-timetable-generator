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
  console.log('   ✅ Collision-Free Invariant: 100% VERIFIED\n');

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
