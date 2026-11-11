import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
    const executableStmt = stmt.replace(/CREATE INDEX IF NOT EXISTS/gi, 'CREATE INDEX');
    try {
      await execute(executableStmt);
    } catch (err: any) {
      // In MySQL, duplicate index or table exists warning is expected
      if (!err.message?.includes('Duplicate key name') && !err.message?.includes('already exists')) {
        console.warn(`[Notice running statement] ${err.message}`);
      }
    }
  }

  // Safe incremental schema column additions
  const migrations = [
    'ALTER TABLE users DROP COLUMN password_hash',
    'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL',
    'ALTER TABLE users ADD COLUMN avatar_url TEXT NULL',
    'ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL',
    'ALTER TABLE rooms ADD COLUMN time_off TEXT DEFAULT NULL',
    'ALTER TABLE rooms ADD COLUMN color VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE faculty ADD COLUMN time_off TEXT DEFAULT NULL',
    'ALTER TABLE faculty ADD COLUMN color VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE courses ADD COLUMN time_off TEXT DEFAULT NULL',
    'ALTER TABLE courses ADD COLUMN color VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE sections ADD COLUMN time_off TEXT DEFAULT NULL',
    'ALTER TABLE sections ADD COLUMN color VARCHAR(20) DEFAULT NULL',
    "ALTER TABLE class_sessions ADD COLUMN batch VARCHAR(50) DEFAULT 'ALL'",
    "ALTER TABLE teaching_assignments ADD COLUMN batch VARCHAR(50) DEFAULT 'ALL'",
    "ALTER TABLE courses ADD COLUMN lesson_format VARCHAR(20) DEFAULT '1_AT_A_TIME'",
    "ALTER TABLE teaching_assignments ADD COLUMN lesson_format VARCHAR(20) DEFAULT 'DEFAULT'",
  ];

  for (const mig of migrations) {
    try {
      await execute(mig);
    } catch {
      // Column likely already exists
    }
  }

  console.log('✅ Schema tables, columns, and indexes verified.');

  // Check if authorized admin user exists (Google SSO)
  const defaultAdmins = [
    { id: 'usr_pratyush', email: 'pratyushsharma978@gmail.com', name: 'Pratyush Kumar' },
  ];

  // Strictly enforce sole user authorization
  await execute('DELETE FROM users WHERE email != ?', ['pratyushsharma978@gmail.com']);

  for (const adm of defaultAdmins) {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [adm.email]);
    if (!existing) {
      await execute(
        'INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)',
        [adm.id, adm.email, adm.name, 'ADMIN']
      );
      console.log(`✅ Authorized Admin created: ${adm.email}`);
    }
  }

  // 1. Clean out stale synthetic schedules, dummy allocations, and courses
  console.log('🧹 Purging any old synthetic dummy data from database...');
  await execute('DELETE FROM class_sessions');
  await execute('DELETE FROM teaching_assignments');
  await execute("DELETE FROM sections WHERE academic_year != '2025-26'");
  await execute("DELETE FROM courses WHERE id LIKE 'crs_%'");
  await execute("DELETE FROM faculty WHERE id LIKE 'fac_1' OR id LIKE 'fac_2' OR id LIKE 'fac_3' OR id LIKE 'fac_4' OR id LIKE 'fac_5' OR id LIKE 'fac_6' OR id LIKE 'fac_ce_%' OR id LIKE 'fac_me_%' OR id LIKE 'fac_ee_%' OR id LIKE 'fac_ec_%' OR id LIKE 'fac_cs_%'");

  // 2. Authentic Departments
  console.log('🏛️ Seeding institutional departments...');
  const depts = [
    { id: 'dept_cse', name: 'Computer Science & Engineering', code: 'CSE' },
    { id: 'dept_ece', name: 'Electronics & Communication Engineering', code: 'ECE' },
  ];
  for (const d of depts) {
    const ex = await queryOne('SELECT id FROM departments WHERE id = ? OR code = ?', [d.id, d.code]);
    if (!ex) {
      await execute('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)', [d.id, d.name, d.code]);
    } else {
      await execute('UPDATE departments SET name = ?, code = ? WHERE id = ?', [d.name, d.code, ex.id]);
    }
  }

  // 3. Rooms: Dedicated Theory Classrooms + Specialized Computer/Engineering Labs
  console.log('🏢 Seeding dedicated home classrooms and specialized engineering labs...');
  const rooms = [
    // Dedicated Theory Home Classrooms (1 per cohort)
    { id: 'rm_lh101', code: 'LH-101', name: 'Aryabhatta Lecture Hall', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_lh102', code: 'LH-102', name: 'Ramanujan Theatre', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_lh103', code: 'LH-103', name: 'Charles Babbage Hall', building: 'Main Academic Block', floor: 2, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_lh104', code: 'LH-104', name: 'JC Bose Lecture Hall', building: 'Main Academic Block', floor: 2, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_cr201', code: 'CR-201', name: 'Lecture Room 201', building: 'Academic Block B', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_cr202', code: 'CR-202', name: 'Lecture Room 202', building: 'Academic Block B', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 80, deptId: 'dept_cse' },
    { id: 'rm_cr301', code: 'CR-301', name: 'PG Lecture Hall 301', building: 'Academic Block B', floor: 3, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 40, deptId: 'dept_cse' },
    { id: 'rm_cr302', code: 'CR-302', name: 'PG Lecture Hall 302', building: 'Academic Block B', floor: 3, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 40, deptId: 'dept_cse' },
    { id: 'rm_ec1', code: 'CR-EC-1', name: 'ECE Lecture Hall 1', building: 'ECE Block', floor: 1, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 75, deptId: 'dept_ece' },
    { id: 'rm_ec2', code: 'CR-EC-2', name: 'ECE Lecture Hall 2', building: 'ECE Block', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 75, deptId: 'dept_ece' },

    // Specialized Computing & Practical Labs (Exclusively for Labs)
    { id: 'rm_lab1', code: 'CS-LAB-1', name: 'Alan Turing Computing Lab', building: 'IT Centre', floor: 3, type: 'COMPUTER_LAB', rows: 6, cols: 6, capacity: 45, deptId: 'dept_cse' },
    { id: 'rm_cs_lab2', code: 'CS-LAB-2', name: 'Ada Lovelace Systems Lab', building: 'IT Centre', floor: 3, type: 'COMPUTER_LAB', rows: 6, cols: 6, capacity: 45, deptId: 'dept_cse' },
    { id: 'rm_ec_lab1', code: 'EC-LAB-1', name: 'VLSI & Hardware Lab', building: 'ECE Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ece' },
    { id: 'rm_ec_lab2', code: 'EC-LAB-2', name: 'DSP & Embedded Systems Lab', building: 'ECE Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ece' },
  ];

  for (const r of rooms) {
    const ex = await queryOne('SELECT id FROM rooms WHERE id = ? OR code = ?', [r.id, r.code]);
    if (ex) {
      await execute(
        'UPDATE rooms SET code = ?, name = ?, building = ?, floor = ?, type = ?, rows = ?, cols = ?, capacity = ?, department_id = ? WHERE id = ?',
        [r.code, r.name, r.building, r.floor, r.type, r.rows, r.cols, r.capacity, r.deptId, ex.id]
      );
    } else {
      await execute(
        'INSERT INTO rooms (id, code, name, building, floor, type, rows, cols, capacity, is_available, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
        [r.id, r.code, r.name, r.building, r.floor, r.type, r.rows, r.cols, r.capacity, r.deptId]
      );
    }
  }

  // 4. Real CSE Faculty Members (18 Authentic Faculty Members from Bihta Campus)
  console.log('👨‍🏫 Seeding authentic NIT Patna Bihta faculty directory...');
  const realFaculty = [
    { id: 'fac_cse_aks', code: 'FAC-CSE-AKS', name: 'Dr. Amit Kumar Singh', email: 'aksingh@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_mps', code: 'FAC-CSE-MPS', name: 'Prof. M. P. Singh', email: 'mps@nitp.ac.in', designation: 'Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 16 },
    { id: 'fac_cse_jps', code: 'FAC-CSE-JPS', name: 'Dr. J .P. Singh', email: 'jps@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_upr', code: 'FAC-CSE-UPR', name: 'Dr. Udai Pratap Rao', email: 'udai@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_kc',  code: 'FAC-CSE-KC',  name: 'Dr. Kakali Chatterjee', email: 'kakali@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_akd', code: 'FAC-CSE-AKD', name: 'Dr. Anil Kumar Dudyala', email: 'anild@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_dd',  code: 'FAC-CSE-DD',  name: 'Dr. Dinesh Dash', email: 'ddash@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_sd',  code: 'FAC-CSE-SD',  name: 'Dr. Suddhasil De', email: 'suddhasil@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_ss',  code: 'FAC-CSE-SS',  name: 'Dr. Somaraju Suvvari', email: 'somaraju@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_mk',  code: 'FAC-CSE-MK',  name: 'Dr. Mukesh Kumar', email: 'mukesh.kumar@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_bm',  code: 'FAC-CSE-BM',  name: 'Dr. Bhaskar Mandal', email: 'bhaskar@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_ds',  code: 'FAC-CSE-DS',  name: 'Dr. Ditipriya Sinha', email: 'ditipriya@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_bbn', code: 'FAC-CSE-BBN', name: 'Dr. B. Balaji Naik', email: 'balajinaik@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_kks', code: 'FAC-CSE-KKS', name: 'Dr. Krishna Kumar Sethi', email: 'kksethi@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_ag',  code: 'FAC-CSE-AG',  name: 'Dr. Antriksh Goswami', email: 'antriksh@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_skt', code: 'FAC-CSE-SKT', name: 'Dr. Santosh Kumar Tripathy', email: 'sktripathy@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_ak',  code: 'FAC-CSE-AK',  name: 'Dr. Abhimanyu Kumar', email: 'abhimanyu@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cse_dm',  code: 'FAC-CSE-DM',  name: 'Dr. Dashrath Mahto', email: 'dmahto@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
  ];

  for (const f of realFaculty) {
    const ex = await queryOne('SELECT id FROM faculty WHERE id = ? OR code = ? OR email = ?', [f.id, f.code, f.email]);
    if (ex) {
      await execute(
        'UPDATE faculty SET code = ?, name = ?, email = ?, designation = ?, department_id = ?, max_daily_periods = ?, max_weekly_periods = ? WHERE id = ?',
        [f.code, f.name, f.email, f.designation, f.deptId, f.maxDaily, f.maxWeekly, ex.id]
      );
    } else {
      await execute(
        'INSERT INTO faculty (id, code, name, email, designation, department_id, max_daily_periods, max_weekly_periods) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [f.id, f.code, f.name, f.email, f.designation, f.deptId, f.maxDaily, f.maxWeekly]
      );
    }
  }

  // 5. Authentic Academic Sections (10 Even Semester Sections)
  console.log('👥 Seeding 10 Even Semester academic sections...');
  const realSections = [
    // 4th Sem B.Tech (UG 2nd Year)
    { id: 'sec_cse_4a', name: 'CSE-I (Sem 4)', department_id: 'dept_cse', semester: 4, strength: 80, academic_year: '2025-26' },
    { id: 'sec_cse_4b', name: 'CSE-II (Sem 4)', department_id: 'dept_cse', semester: 4, strength: 80, academic_year: '2025-26' },
    { id: 'sec_cse_4c', name: 'CSE-III+DD (Sem 4)', department_id: 'dept_cse', semester: 4, strength: 80, academic_year: '2025-26' },

    // 6th Sem B.Tech (UG 3rd Year)
    { id: 'sec_cse_6a', name: 'CSE-I (Sem 6)', department_id: 'dept_cse', semester: 6, strength: 75, academic_year: '2025-26' },
    { id: 'sec_cse_6b', name: 'CSE-II (Sem 6)', department_id: 'dept_cse', semester: 6, strength: 75, academic_year: '2025-26' },
    { id: 'sec_cse_6c', name: 'CSE-III+DD (Sem 6)', department_id: 'dept_cse', semester: 6, strength: 75, academic_year: '2025-26' },

    // 8th Sem Dual Degree & 2nd Sem M.Tech Advanced PG Cohorts
    { id: 'sec_cse_8_ds', name: 'DD+M.Tech DS (Sem 8/2)', department_id: 'dept_cse', semester: 8, strength: 35, academic_year: '2025-26' },
    { id: 'sec_cse_8_cs', name: 'DD+M.Tech CS (Sem 8/2)', department_id: 'dept_cse', semester: 8, strength: 35, academic_year: '2025-26' },

    // ECE Servicing Cohorts (taught by CSE Department for OOPs CS45101)
    { id: 'sec_ece_4a', name: 'ECE-I (Sem 4)', department_id: 'dept_ece', semester: 4, strength: 70, academic_year: '2025-26' },
    { id: 'sec_ece_4b', name: 'ECE-II (Sem 4)', department_id: 'dept_ece', semester: 4, strength: 70, academic_year: '2025-26' },
  ];

  for (const s of realSections) {
    const ex = await queryOne('SELECT id FROM sections WHERE id = ?', [s.id]);
    if (ex) {
      await execute(
        'UPDATE sections SET name = ?, department_id = ?, semester = ?, strength = ?, academic_year = ? WHERE id = ?',
        [s.name, s.department_id, s.semester, s.strength, s.academic_year, s.id]
      );
    } else {
      await execute(
        'INSERT INTO sections (id, name, department_id, semester, strength, academic_year) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.name, s.department_id, s.semester, s.strength, s.academic_year]
      );
    }
  }

  // 6. Authentic Courses (24 Curriculum Courses with strictly paired spans)
  console.log('📚 Seeding authentic curriculum courses with strictly paired lab spans...');
  const realCourses = [
    // 4th Semester Subjects
    { id: 'c_cs44112', code: 'CS44112', name: 'Artificial Intelligence', department_id: 'dept_cse', semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs44112_th', code: 'CS44112-TH', name: 'Artificial Intelligence (Theory)', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs44112_pr', code: 'CS44112-PR', name: 'Artificial Intelligence (Lab)', department_id: 'dept_cse', semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

    { id: 'c_cs44113', code: 'CS44113', name: 'Computer Networks', department_id: 'dept_cse', semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs44113_th', code: 'CS44113-TH', name: 'Computer Networks (Theory)', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs44113_pr', code: 'CS44113-PR', name: 'Computer Networks (Lab)', department_id: 'dept_cse', semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

    { id: 'c_cs44114', code: 'CS44114', name: 'Automata Theory and Compiler Design', department_id: 'dept_cse', semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs44114_th', code: 'CS44114-TH', name: 'Automata Theory and Compiler Design (Theory)', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs44114_pr', code: 'CS44114-PR', name: 'Automata Theory and Compiler Design (Lab)', department_id: 'dept_cse', semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

    { id: 'c_cs44115', code: 'CS44115', name: 'Design and Analysis of Algorithms', department_id: 'dept_cse', semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs44115_th', code: 'CS44115-TH', name: 'Design and Analysis of Algorithms (Theory)', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs44115_pr', code: 'CS44115-PR', name: 'Design and Analysis of Algorithms (Lab)', department_id: 'dept_cse', semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

    { id: 'c_cs44164', code: 'CS44164', name: 'Computer System Parallelism', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs44146', code: 'CS44146', name: 'Operations Research', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

    // 6th Semester Subjects
    { id: 'c_cs64120', code: 'CS64120', name: 'Data Mining', department_id: 'dept_cse', semester: 6, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs64121', code: 'CS64121', name: 'Cloud Computing', department_id: 'dept_cse', semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs64163', code: 'CS64163', name: 'Recommendation Systems', department_id: 'dept_cse', semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs64161', code: 'CS64161', name: 'Blockchain Technology', department_id: 'dept_cse', semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs64158', code: 'CS64158', name: 'Distributed Systems', department_id: 'dept_cse', semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

    // 8th Semester / M.Tech 2nd Semester Electives & Advanced Subjects
    { id: 'c_cs84130', code: 'CS84130', name: 'Natural Language Processing', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84131', code: 'CS84131', name: 'Deep Learning', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84132', code: 'CS84132', name: 'Data Visualization Techniques', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84138', code: 'CS84138', name: 'Intrusion Detection and Prevention', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84139', code: 'CS84139', name: 'Advanced Internet of Things (IoT)', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84140', code: 'CS84140', name: 'Cyber Forensics', department_id: 'dept_cse', semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs84190', code: 'CS84190', name: 'Federated Learning', department_id: 'dept_cse', semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs84284', code: 'CS84284', name: 'Computational Geometry', department_id: 'dept_cse', semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

    // ECE Servicing Courses
    { id: 'c_cs45101', code: 'CS45101', name: 'Object Oriented Programming', department_id: 'dept_cse', semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
    { id: 'c_cs45101_th', code: 'CS45101-TH', name: 'Object Oriented Programming (Theory)', department_id: 'dept_cse', semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
    { id: 'c_cs45101_pr', code: 'CS45101-PR', name: 'Object Oriented Programming (Lab)', department_id: 'dept_cse', semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },
    { id: 'c_cs85101', code: 'CS85101', name: 'Open Elective Deep Learning (ECE)', department_id: 'dept_cse', semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  ];

  for (const c of realCourses) {
    const ex = await queryOne('SELECT id FROM courses WHERE id = ? OR code = ?', [c.id, c.code]);
    if (ex) {
      await execute(
        'UPDATE courses SET code = ?, name = ?, department_id = ?, semester = ?, periods_per_week = ?, span = ?, lesson_format = ? WHERE id = ?',
        [c.code, c.name, c.department_id, c.semester, c.periods_per_week, c.span, c.lesson_format, ex.id]
      );
    } else {
      await execute(
        'INSERT INTO courses (id, code, name, department_id, semester, periods_per_week, span, lesson_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.code, c.name, c.department_id, c.semester, c.periods_per_week, c.span, c.lesson_format]
      );
    }
  }

  // 7. Authentic Teaching Assignments (46 Allocations from Official Excel)
  console.log('📌 Seeding 46 authentic faculty teaching assignments...');
  const allocations = [
    // ==================== CSUG-I 4th Sem ====================
    { section_id: 'sec_cse_4a', course_id: 'c_cs44112_th', faculty_id: 'fac_cse_upr', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44112_pr', faculty_id: 'fac_cse_ss',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44113_th', faculty_id: 'fac_cse_aks', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44113_pr', faculty_id: 'fac_cse_dm',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44114',    faculty_id: 'fac_cse_dd',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44115',    faculty_id: 'fac_cse_ak',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4a', course_id: 'c_cs44164',    faculty_id: 'fac_cse_sd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== CSUG-II 4th Sem ====================
    { section_id: 'sec_cse_4b', course_id: 'c_cs44112',    faculty_id: 'fac_cse_mk',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44113',    faculty_id: 'fac_cse_dm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44114_th', faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44114_pr', faculty_id: 'fac_cse_bm',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44115_th', faculty_id: 'fac_cse_ak',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44115_pr', faculty_id: 'fac_cse_ag',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_cse_4b', course_id: 'c_cs44146',    faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== CSUG-III + DD 4th Sem ====================
    { section_id: 'sec_cse_4c', course_id: 'c_cs44112',    faculty_id: 'fac_cse_mk',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4c', course_id: 'c_cs44113',    faculty_id: 'fac_cse_dm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4c', course_id: 'c_cs44114',    faculty_id: 'fac_cse_kks', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_4c', course_id: 'c_cs44115_th', faculty_id: 'fac_cse_mps', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_4c', course_id: 'c_cs44115_pr', faculty_id: 'fac_cse_dd',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_cse_4c', course_id: 'c_cs44146',    faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== CSUG-I 6th Sem ====================
    { section_id: 'sec_cse_6a', course_id: 'c_cs64120',    faculty_id: 'fac_cse_akd', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_6a', course_id: 'c_cs64121',    faculty_id: 'fac_cse_kc',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_6a', course_id: 'c_cs64163',    faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_6a', course_id: 'c_cs64161',    faculty_id: 'fac_cse_ds',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== CSUG-II 6th Sem ====================
    { section_id: 'sec_cse_6b', course_id: 'c_cs64120',    faculty_id: 'fac_cse_akd', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_6b', course_id: 'c_cs64121',    faculty_id: 'fac_cse_ag',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_6b', course_id: 'c_cs64163',    faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== CSUG-III + DD 6th Sem ====================
    { section_id: 'sec_cse_6c', course_id: 'c_cs64120',    faculty_id: 'fac_cse_skt', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_6c', course_id: 'c_cs64121',    faculty_id: 'fac_cse_ag',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_6c', course_id: 'c_cs64158',    faculty_id: 'fac_cse_sd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== DD + M.Tech (Data Science) 8th / 2nd Sem ====================
    { section_id: 'sec_cse_8_ds', course_id: 'c_cs84130',   faculty_id: 'fac_cse_jps', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_ds', course_id: 'c_cs84131',   faculty_id: 'fac_cse_bm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_ds', course_id: 'c_cs84132',   faculty_id: 'fac_cse_skt', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_ds', course_id: 'c_cs84190',   faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_8_ds', course_id: 'c_cs84284',   faculty_id: 'fac_cse_dd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== DD + M.Tech (Cyber Security) 8th / 2nd Sem ====================
    { section_id: 'sec_cse_8_cs', course_id: 'c_cs84138',   faculty_id: 'fac_cse_kc',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_cs', course_id: 'c_cs84139',   faculty_id: 'fac_cse_bm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_cs', course_id: 'c_cs84140',   faculty_id: 'fac_cse_upr', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_cse_8_cs', course_id: 'c_cs84190',   faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_cse_8_cs', course_id: 'c_cs84284',   faculty_id: 'fac_cse_dd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

    // ==================== ECE 4th Sem (Servicing Courses) ====================
    { section_id: 'sec_ece_4a', course_id: 'c_cs45101',     faculty_id: 'fac_cse_ds',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
    { section_id: 'sec_ece_4b', course_id: 'c_cs45101_th',  faculty_id: 'fac_cse_ds',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
    { section_id: 'sec_ece_4b', course_id: 'c_cs45101_pr',  faculty_id: 'fac_cse_sd',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
    { section_id: 'sec_ece_4a', course_id: 'c_cs85101',     faculty_id: 'fac_cse_bm',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  ];

  for (const a of allocations) {
    const id = 'ta_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await execute(
      'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, batch, lesson_format) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, a.section_id, a.course_id, a.faculty_id, a.periods_per_week, 'ALL', a.lesson_format]
    );
  }

  // 8. Exam Schedule & Seating Demo Students
  const existingExam = await queryOne('SELECT id FROM exam_schedules WHERE id = ?', ['exam_midterm_2026']);
  if (!existingExam) {
    await execute(
      'INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)',
      ['exam_midterm_2026', 'Mid-Term Examinations Even Sem 2026', '2026-11-25', 'Morning (09:30-12:30)']
    );
  }

  const existingStudents = await queryOne<{ count: number }>('SELECT count(*) as count FROM students');
  if (Number(existingStudents?.count || 0) < 36) {
    for (let i = 1; i <= 18; i++) {
      const pad = String(i).padStart(3, '0');
      const exCse = await queryOne('SELECT id FROM students WHERE id = ?', [`stu_cse_${i}`]);
      if (!exCse) {
        await execute(
          'INSERT INTO students (id, roll_number, name, department_id, semester) VALUES (?, ?, ?, ?, ?)',
          [`stu_cse_${i}`, `2026-CSE-${pad}`, `CSE Student ${i}`, 'dept_cse', 4]
        );
      }
      const exEce = await queryOne('SELECT id FROM students WHERE id = ?', [`stu_ece_${i}`]);
      if (!exEce) {
        await execute(
          'INSERT INTO students (id, roll_number, name, department_id, semester) VALUES (?, ?, ?, ?, ?)',
          [`stu_ece_${i}`, `2026-ECE-${pad}`, `ECE Student ${i}`, 'dept_ece', 4]
        );
      }
    }
  }

  console.log('🎉 Authentic NIT Patna Bihta Campus Even Semester 2026 database initialization complete!');
  console.log(`   - Faculty Members: ${realFaculty.length}`);
  console.log(`   - Academic Sections: ${realSections.length}`);
  console.log(`   - Curriculum Courses: ${realCourses.length}`);
  console.log(`   - Teaching Allocations: ${allocations.length}`);
}

initDb()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('Database initialization error:', e);
    process.exit(1);
  });
