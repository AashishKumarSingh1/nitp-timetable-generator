import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { query, execute, queryOne } from '../lib/db';

async function initDb() {
  console.log('⚡ Initializing database schema from db/schema.sql...');
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split and execute statements
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await execute(stmt);
    } catch (err: any) {
      console.warn(`[Warning running statement] ${err.message}`);
    }
  }
  console.log('✅ Schema tables and indexes verified.');

  // Check if admin user exists
  const existingAdmin = await queryOne('SELECT id FROM users WHERE email = ?', ['admin@nitp.ac.in']);
  if (!existingAdmin) {
    const adminId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    await execute(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'admin@nitp.ac.in', passwordHash, 'System Administrator', 'ADMIN']
    );
    console.log('✅ Default Admin created: admin@nitp.ac.in / AdminPassword123!');
  }

  // Seed default departments if none
  const deptCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM departments');
  if (Number(deptCount?.count || 0) === 0) {
    console.log('🌱 Seeding initial departments, rooms, faculty, and courses...');
    const depts = [
      { id: 'dept_cse', name: 'Computer Science & Engineering', code: 'CSE' },
      { id: 'dept_ece', name: 'Electronics & Communication Engineering', code: 'ECE' },
      { id: 'dept_mech', name: 'Mechanical Engineering', code: 'MECH' },
      { id: 'dept_ee', name: 'Electrical Engineering', code: 'EE' },
      { id: 'dept_ce', name: 'Civil Engineering', code: 'CE' },
    ];
    for (const d of depts) {
      await execute('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)', [d.id, d.name, d.code]);
    }

    // Seed Rooms
    const rooms = [
      { id: 'rm_101', code: 'LH-101', name: 'Aryabhatta Lecture Hall', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 36, deptId: 'dept_cse' },
      { id: 'rm_102', code: 'LH-102', name: 'Ramanujan Theatre', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 5, capacity: 30, deptId: 'dept_ece' },
      { id: 'rm_201', code: 'CR-201', name: 'Main Seminar Hall 201', building: 'Block B', floor: 2, type: 'CLASSROOM', rows: 5, cols: 5, capacity: 25, deptId: 'dept_mech' },
      { id: 'rm_lab1', code: 'CS-LAB-1', name: 'Alan Turing Computing Lab', building: 'IT Centre', floor: 3, type: 'COMPUTER_LAB', rows: 6, cols: 6, capacity: 36, deptId: 'dept_cse' },
      { id: 'rm_lab2', code: 'EC-LAB-1', name: 'VLSI & Embedded Lab', building: 'ECE Block', floor: 2, type: 'COMPUTER_LAB', rows: 5, cols: 4, capacity: 20, deptId: 'dept_ece' },
      { id: 'rm_sh', code: 'SH-301', name: 'Sir Visvesvaraya Auditorium', building: 'Convention Block', floor: 3, type: 'SEMINAR_HALL', rows: 8, cols: 6, capacity: 48, deptId: null },
    ];
    for (const r of rooms) {
      await execute(
        'INSERT INTO rooms (id, code, name, building, floor, type, rows, cols, capacity, is_available, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [r.id, r.code, r.name, r.building, r.floor, r.type, r.rows, r.cols, r.capacity, r.deptId]
      );
    }

    // Seed Faculty
    const facultyList = [
      { id: 'fac_1', code: 'FAC-CS-01', name: 'Dr. Rajesh Sharma', email: 'rsharma@nitp.ac.in', designation: 'Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 16 },
      { id: 'fac_2', code: 'FAC-CS-02', name: 'Dr. Anita Sen', email: 'asen@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
      { id: 'fac_3', code: 'FAC-EC-01', name: 'Prof. Vikram Roy', email: 'vroy@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ece', maxDaily: 3, maxWeekly: 14 },
      { id: 'fac_4', code: 'FAC-ME-01', name: 'Dr. Manoj Verma', email: 'mverma@nitp.ac.in', designation: 'Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 16 },
      { id: 'fac_5', code: 'FAC-EE-01', name: 'Dr. Sunita Rao', email: 'srao@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },
      { id: 'fac_6', code: 'FAC-CE-01', name: 'Prof. Amit Patel', email: 'apatel@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ce', maxDaily: 3, maxWeekly: 15 },
    ];
    for (const f of facultyList) {
      await execute(
        'INSERT INTO faculty (id, code, name, email, designation, department_id, max_daily_periods, max_weekly_periods) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [f.id, f.code, f.name, f.email, f.designation, f.deptId, f.maxDaily, f.maxWeekly]
      );
    }

    // Seed Courses
    const courses = [
      { id: 'crs_cs1', code: 'CS301', name: 'Database Management Systems', deptId: 'dept_cse', periodsPerWeek: 4, span: 1 },
      { id: 'crs_cs2', code: 'CS302', name: 'Operating Systems & Architecture', deptId: 'dept_cse', periodsPerWeek: 3, span: 1 },
      { id: 'crs_cs3', code: 'CS303L', name: 'Database Engineering Lab', deptId: 'dept_cse', periodsPerWeek: 2, span: 2 },
      { id: 'crs_ec1', code: 'EC301', name: 'Digital Signal Processing', deptId: 'dept_ece', periodsPerWeek: 3, span: 1 },
      { id: 'crs_ec2', code: 'EC302L', name: 'Embedded Hardware Lab', deptId: 'dept_ece', periodsPerWeek: 2, span: 2 },
      { id: 'crs_me1', code: 'ME301', name: 'Thermodynamics & Fluid Dynamics', deptId: 'dept_mech', periodsPerWeek: 4, span: 1 },
    ];
    for (const c of courses) {
      await execute(
        'INSERT INTO courses (id, code, name, department_id, periods_per_week, span) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.code, c.name, c.deptId, c.periodsPerWeek, c.span]
      );
    }

    // Seed Students for Seating Engine demonstrations (18 CSE students, 18 ECE students)
    const students = [];
    for (let i = 1; i <= 18; i++) {
      const pad = String(i).padStart(3, '0');
      students.push({
        id: `stu_cse_${i}`,
        rollNumber: `2026-CSE-${pad}`,
        name: `CSE Student ${i}`,
        deptId: 'dept_cse',
        semester: 5,
      });
      students.push({
        id: `stu_ece_${i}`,
        rollNumber: `2026-ECE-${pad}`,
        name: `ECE Student ${i}`,
        deptId: 'dept_ece',
        semester: 5,
      });
    }
    for (const s of students) {
      await execute(
        'INSERT INTO students (id, roll_number, name, department_id, semester) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.rollNumber, s.name, s.deptId, s.semester]
      );
    }

    console.log(`✅ Seeded ${students.length} students across CSE and ECE for seating verification.`);

    // Seed default Exam Schedule
    await execute(
      'INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)',
      ['exam_midterm_2026', 'Mid-Term Examinations Autumn 2026', '2026-10-25', 'Morning (09:30-12:30)']
    );
    console.log('✅ Seeded default exam schedule.');
  }

  console.log('🎉 Database initialization complete!');
}

initDb().catch((e) => {
  console.error('Database initialization error:', e);
  process.exit(1);
});
