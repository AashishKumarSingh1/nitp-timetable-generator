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

  // 2. Departments
  console.log('🏛️ Seeding departments...');
  const depts = [
    { id: 'dept_cse', name: 'Computer Science & Engineering', code: 'CSE' },
    { id: 'dept_ece', name: 'Electronics & Communication Engineering', code: 'ECE' },
    { id: 'dept_mech', name: 'Mechanical Engineering', code: 'MECH' },
    { id: 'dept_ee', name: 'Electrical Engineering', code: 'EE' },
    { id: 'dept_ce', name: 'Civil Engineering', code: 'CE' },
  ];
  for (const d of depts) {
    const ex = await queryOne('SELECT id FROM departments WHERE id = ? OR code = ?', [d.id, d.code]);
    if (!ex) {
      await execute('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)', [d.id, d.name, d.code]);
    }
  }

  // 3. Rooms: 12 Dedicated Theory Home Classrooms + 2 Auditoriums + 10 Specialized Labs
  console.log('🏢 Seeding dedicated home classrooms and specialized engineering labs...');
  const rooms = [
    // Dedicated Theory Home Classrooms (1 per cohort)
    { id: 'rm_101', code: 'LH-101', name: 'Aryabhatta Lecture Hall', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 60, deptId: 'dept_cse' },
    { id: 'rm_102', code: 'LH-102', name: 'Ramanujan Theatre', building: 'Main Academic Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 60, deptId: 'dept_cse' },
    { id: 'rm_103', code: 'LH-103', name: 'Charles Babbage Hall', building: 'Main Academic Block', floor: 2, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 50, deptId: 'dept_cse' },
    { id: 'rm_104', code: 'LH-104', name: 'JC Bose Lecture Hall', building: 'ECE Block', floor: 1, type: 'LECTURE_HALL', rows: 6, cols: 6, capacity: 60, deptId: 'dept_ece' },
    { id: 'rm_ec2', code: 'CR-EC-2', name: 'Vikram Sarabhai Hall', building: 'ECE Block', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 60, deptId: 'dept_ece' },
    { id: 'rm_me1', code: 'CR-ME-1', name: 'Mechanical Class Hall 1', building: 'Mechanical Block', floor: 1, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 60, deptId: 'dept_mech' },
    { id: 'rm_me2', code: 'CR-ME-2', name: 'Mechanical Class Hall 2', building: 'Mechanical Block', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 60, deptId: 'dept_mech' },
    { id: 'rm_ee1', code: 'CR-EE-1', name: 'Electrical Class Hall 1', building: 'EE Block', floor: 1, type: 'CLASSROOM', rows: 6, cols: 5, capacity: 30, deptId: 'dept_ee' },
    { id: 'rm_ee2', code: 'CR-EE-2', name: 'Electrical Class Hall 2', building: 'EE Block', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 60, deptId: 'dept_ee' },
    { id: 'rm_ce1', code: 'CR-CE-1', name: 'Civil Class Hall 1', building: 'Civil Block', floor: 1, type: 'CLASSROOM', rows: 6, cols: 5, capacity: 30, deptId: 'dept_ce' },
    { id: 'rm_ce2', code: 'CR-CE-2', name: 'Civil Class Hall 2', building: 'Civil Block', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 60, deptId: 'dept_ce' },
    { id: 'rm_ce3', code: 'CR-CE-3', name: 'Civil Class Hall 3', building: 'Civil Block', floor: 3, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 65, deptId: 'dept_ce' },
    // Seminar & Conference Halls
    { id: 'rm_201', code: 'CR-201', name: 'Main Seminar Hall 201', building: 'Block B', floor: 2, type: 'CLASSROOM', rows: 6, cols: 6, capacity: 50, deptId: 'dept_mech' },
    { id: 'rm_sh', code: 'SH-301', name: 'Sir Visvesvaraya Auditorium', building: 'Convention Block', floor: 3, type: 'SEMINAR_HALL', rows: 8, cols: 8, capacity: 80, deptId: null },
    // Specialized Engineering & Computing Labs for Practical Sessions
    { id: 'rm_lab1', code: 'CS-LAB-1', name: 'Alan Turing Computing Lab', building: 'IT Centre', floor: 3, type: 'COMPUTER_LAB', rows: 6, cols: 6, capacity: 40, deptId: 'dept_cse' },
    { id: 'rm_cs_lab2', code: 'CS-LAB-2', name: 'Ada Lovelace Systems Lab', building: 'IT Centre', floor: 3, type: 'COMPUTER_LAB', rows: 6, cols: 6, capacity: 40, deptId: 'dept_cse' },
    { id: 'rm_lab2', code: 'EC-LAB-1', name: 'VLSI & Embedded Lab', building: 'ECE Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ece' },
    { id: 'rm_ec_lab2', code: 'EC-LAB-2', name: 'DSP & Signal Processing Lab', building: 'ECE Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ece' },
    { id: 'rm_me_lab1', code: 'ME-LAB-1', name: 'Computational Mechanics & CAD Lab', building: 'Mechanical Block', floor: 1, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_mech' },
    { id: 'rm_me_lab2', code: 'ME-LAB-2', name: 'Fluid Mechanics & Machinery Lab', building: 'Mechanical Block', floor: 1, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_mech' },
    { id: 'rm_ee_lab1', code: 'EE-LAB-1', name: 'Power Simulation & Drives Lab', building: 'EE Block', floor: 1, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ee' },
    { id: 'rm_ee_lab2', code: 'EE-LAB-2', name: 'Control Systems Simulation Lab', building: 'EE Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ee' },
    { id: 'rm_ce_lab1', code: 'CE-LAB-1', name: 'Concrete & Materials Testing Lab', building: 'Civil Block', floor: 1, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ce' },
    { id: 'rm_ce_lab2', code: 'CE-LAB-2', name: 'Civil CAD & Geotechnical Lab', building: 'Civil Block', floor: 2, type: 'COMPUTER_LAB', rows: 6, cols: 5, capacity: 40, deptId: 'dept_ce' },
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

  // 4. Faculty (27 professors across 5 departments)
  console.log('👨‍🏫 Seeding faculty directory with balanced caps...');
  const facultyList = [
    // CSE Faculty
    { id: 'fac_1', code: 'FAC-CS-01', name: 'Dr. Rajesh Sharma', email: 'rsharma@nitp.ac.in', designation: 'Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_2', code: 'FAC-CS-02', name: 'Dr. Anita Sen', email: 'asen@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cs_3', code: 'FAC-CS-03', name: 'Dr. Alok Kumar', email: 'akumar@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cs_4', code: 'FAC-CS-04', name: 'Dr. Neha Kumari', email: 'nkumari@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cs_5', code: 'FAC-CS-05', name: 'Prof. Abhishek Anand', email: 'aanand@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_cs_6', code: 'FAC-CS-06', name: 'Dr. Sweta Sinha', email: 'ssinha@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_cse', maxDaily: 4, maxWeekly: 18 },

    // ECE Faculty
    { id: 'fac_3', code: 'FAC-EC-01', name: 'Prof. Vikram Roy', email: 'vroy@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ece', maxDaily: 4, maxWeekly: 16 },
    { id: 'fac_ec_2', code: 'FAC-EC-02', name: 'Dr. Priya Ranjan', email: 'pranjan@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ece', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ec_3', code: 'FAC-EC-03', name: 'Dr. Arvind Kumar', email: 'akumar.ec@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ece', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ec_4', code: 'FAC-EC-04', name: 'Prof. Shalini Singh', email: 'ssingh@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ece', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ec_5', code: 'FAC-EC-05', name: 'Dr. Manish Tiwari', email: 'mtiwari@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ece', maxDaily: 4, maxWeekly: 18 },

    // MECH Faculty
    { id: 'fac_4', code: 'FAC-ME-01', name: 'Dr. Manoj Verma', email: 'mverma@nitp.ac.in', designation: 'Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_me_2', code: 'FAC-ME-02', name: 'Prof. Sanjay Gupta', email: 'sgupta@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_me_3', code: 'FAC-ME-03', name: 'Dr. R. K. Singh', email: 'rksingh@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_me_4', code: 'FAC-ME-04', name: 'Prof. Deepak Verma', email: 'dverma@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_me_5', code: 'FAC-ME-05', name: 'Dr. Ankit Mishra', email: 'amishra@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_mech', maxDaily: 4, maxWeekly: 18 },

    // EE Faculty
    { id: 'fac_5', code: 'FAC-EE-01', name: 'Dr. Sunita Rao', email: 'srao@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ee_2', code: 'FAC-EE-02', name: 'Prof. Rajiv Nayan', email: 'rnayan@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ee_3', code: 'FAC-EE-03', name: 'Dr. K. S. Verma', email: 'ksverma@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ee_4', code: 'FAC-EE-04', name: 'Prof. Ananya Roy', email: 'aroy@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ee_5', code: 'FAC-EE-05', name: 'Dr. Vivek Prakash', email: 'vprakash@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ee', maxDaily: 4, maxWeekly: 18 },

    // CE Faculty
    { id: 'fac_6', code: 'FAC-CE-01', name: 'Prof. Amit Patel', email: 'apatel@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ce_2', code: 'FAC-CE-02', name: 'Dr. Sunita Mishra', email: 'smishra@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ce_3', code: 'FAC-CE-03', name: 'Prof. Ramesh Chandra', email: 'rchandra@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ce_4', code: 'FAC-CE-04', name: 'Dr. Vibha Sharma', email: 'vsharma@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ce_5', code: 'FAC-CE-05', name: 'Prof. K. K. Choudhary', email: 'kchoudhary@nitp.ac.in', designation: 'Assistant Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
    { id: 'fac_ce_6', code: 'FAC-CE-06', name: 'Dr. Pradeep Kumar', email: 'pkumar@nitp.ac.in', designation: 'Associate Professor', deptId: 'dept_ce', maxDaily: 4, maxWeekly: 18 },
  ];
  for (const f of facultyList) {
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

  // 5. Courses (6 courses per department: 4 theory courses + 2 practical lab courses)
  console.log('📚 Seeding 5-6 academic courses per department...');
  const courses = [
    // CSE Courses (6 subjects)
    { id: 'crs_cs1', code: 'CS301', name: 'Database Management Systems', deptId: 'dept_cse', periods: 3, span: 1 },
    { id: 'crs_cs2', code: 'CS302', name: 'Operating Systems & Architecture', deptId: 'dept_cse', periods: 3, span: 1 },
    { id: 'crs_cs3', code: 'CS303', name: 'Design & Analysis of Algorithms', deptId: 'dept_cse', periods: 3, span: 1 },
    { id: 'crs_cs4', code: 'CS304', name: 'Computer Networks & Security', deptId: 'dept_cse', periods: 3, span: 1 },
    { id: 'crs_cs5l', code: 'CS305L', name: 'Database Engineering Lab', deptId: 'dept_cse', periods: 2, span: 2 },
    { id: 'crs_cs6l', code: 'CS306L', name: 'Networks & Systems Simulation Lab', deptId: 'dept_cse', periods: 2, span: 2 },
    { id: 'crs_cs_ai', code: 'CS901', name: 'Advanced AI Architectures', deptId: 'dept_cse', periods: 3, span: 1 },

    // ECE Courses (6 subjects)
    { id: 'crs_ec1', code: 'EC301', name: 'Digital Signal Processing', deptId: 'dept_ece', periods: 3, span: 1 },
    { id: 'crs_ec2', code: 'EC302', name: 'Communication Systems Engineering', deptId: 'dept_ece', periods: 3, span: 1 },
    { id: 'crs_ec3', code: 'EC303', name: 'Microprocessors & Microcontrollers', deptId: 'dept_ece', periods: 3, span: 1 },
    { id: 'crs_ec4', code: 'EC304', name: 'Electromagnetic Waves & Antennas', deptId: 'dept_ece', periods: 3, span: 1 },
    { id: 'crs_ec5l', code: 'EC305L', name: 'VLSI & Embedded Systems Lab', deptId: 'dept_ece', periods: 2, span: 2 },
    { id: 'crs_ec6l', code: 'EC306L', name: 'DSP & Communication Hardware Lab', deptId: 'dept_ece', periods: 2, span: 2 },

    // MECH Courses (6 subjects)
    { id: 'crs_me1', code: 'ME301', name: 'Thermodynamics & Fluid Dynamics', deptId: 'dept_mech', periods: 3, span: 1 },
    { id: 'crs_me2', code: 'ME302', name: 'Manufacturing Processes & Metrology', deptId: 'dept_mech', periods: 3, span: 1 },
    { id: 'crs_me3', code: 'ME303', name: 'Kinematics & Dynamics of Machines', deptId: 'dept_mech', periods: 3, span: 1 },
    { id: 'crs_me4', code: 'ME304', name: 'Mechanics of Materials & Structures', deptId: 'dept_mech', periods: 3, span: 1 },
    { id: 'crs_me5l', code: 'ME305L', name: 'Fluid Mechanics & Machinery Lab', deptId: 'dept_mech', periods: 2, span: 2 },
    { id: 'crs_me6l', code: 'ME306L', name: 'CAD & Finite Element Modeling Lab', deptId: 'dept_mech', periods: 2, span: 2 },

    // EE Courses (6 subjects)
    { id: 'crs_ee1', code: 'EE301', name: 'Power Systems & Electrical Machines', deptId: 'dept_ee', periods: 3, span: 1 },
    { id: 'crs_ee2', code: 'EE302', name: 'Control Systems Engineering', deptId: 'dept_ee', periods: 3, span: 1 },
    { id: 'crs_ee3', code: 'EE303', name: 'Electrical Network Analysis & Synthesis', deptId: 'dept_ee', periods: 3, span: 1 },
    { id: 'crs_ee4', code: 'EE304', name: 'Power Electronics & Industrial Drives', deptId: 'dept_ee', periods: 3, span: 1 },
    { id: 'crs_ee5l', code: 'EE305L', name: 'Electrical Machines & Drives Lab', deptId: 'dept_ee', periods: 2, span: 2 },
    { id: 'crs_ee6l', code: 'EE306L', name: 'Control Systems & Power Sim Lab', deptId: 'dept_ee', periods: 2, span: 2 },

    // CE Courses (6 subjects)
    { id: 'crs_ce1', code: 'CE301', name: 'Structural Analysis & Concrete Tech', deptId: 'dept_ce', periods: 3, span: 1 },
    { id: 'crs_ce2', code: 'CE302', name: 'Geotechnical & Soil Mechanics', deptId: 'dept_ce', periods: 3, span: 1 },
    { id: 'crs_ce3', code: 'CE303', name: 'Transportation & Highway Engineering', deptId: 'dept_ce', periods: 3, span: 1 },
    { id: 'crs_ce4', code: 'CE304', name: 'Hydrology & Water Resources Engineering', deptId: 'dept_ce', periods: 3, span: 1 },
    { id: 'crs_ce5l', code: 'CE305L', name: 'Concrete Technology & Materials Lab', deptId: 'dept_ce', periods: 2, span: 2 },
    { id: 'crs_ce6l', code: 'CE306L', name: 'Geotechnical & Surveying CAD Lab', deptId: 'dept_ce', periods: 2, span: 2 },
  ];

  for (const c of courses) {
    const ex = await queryOne('SELECT id FROM courses WHERE id = ? OR code = ?', [c.id, c.code]);
    if (ex) {
      await execute(
        'UPDATE courses SET code = ?, name = ?, department_id = ?, periods_per_week = ?, span = ? WHERE id = ?',
        [c.code, c.name, c.deptId, c.periods, c.span, ex.id]
      );
    } else {
      await execute(
        'INSERT INTO courses (id, code, name, department_id, periods_per_week, span) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.code, c.name, c.deptId, c.periods, c.span]
      );
    }
  }

  // 6. Cohort Sections (12 sections across 5 departments)
  console.log('👥 Seeding cohort sections...');
  const sections = [
    { id: 'sec_cse_a', name: 'Section A', deptId: 'dept_cse', sem: 5, strength: 60 },
    { id: 'sec_cse_b', name: 'Section B', deptId: 'dept_cse', sem: 5, strength: 60 },
    { id: 'sec_cse_ai', name: 'Dual-Degree AI', deptId: 'dept_cse', sem: 9, strength: 35 },
    { id: 'sec_ece_a', name: 'Section A', deptId: 'dept_ece', sem: 5, strength: 60 },
    { id: 'sec_ece_b', name: 'Section B', deptId: 'dept_ece', sem: 5, strength: 55 },
    { id: 'sec_me_a', name: 'Section A', deptId: 'dept_mech', sem: 5, strength: 60 },
    { id: 'sec_me_b', name: 'Section B', deptId: 'dept_mech', sem: 5, strength: 55 },
    { id: 'sec_ee_a', name: 'Section A', deptId: 'dept_ee', sem: 5, strength: 60 },
    { id: 'sec_ee_b', name: 'Section B', deptId: 'dept_ee', sem: 5, strength: 55 },
    { id: 'sec_ce_a', name: 'Section A', deptId: 'dept_ce', sem: 5, strength: 60 },
    { id: 'sec_ce_b', name: 'Section B', deptId: 'dept_ce', sem: 5, strength: 55 },
    { id: 'sec_ce_c', name: 'Section C', deptId: 'dept_ce', sem: 5, strength: 65 },
  ];

  for (const s of sections) {
    const ex = await queryOne('SELECT id FROM sections WHERE department_id = ? AND name = ?', [s.deptId, s.name]);
    if (!ex) {
      await execute(
        'INSERT INTO sections (id, name, department_id, semester, strength, academic_year) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.name, s.deptId, s.sem, s.strength, '2026-27']
      );
    } else {
      await execute('UPDATE sections SET semester = ?, strength = ? WHERE id = ?', [s.sem, s.strength, ex.id]);
    }
  }

  // 7. Teaching Allocations (Scenario 1: Primary Subject Teachers)
  console.log('📌 Seeding primary subject-code faculty allocations...');
  const teachingMappings = [
    // CSE Subjects (6 subjects)
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS301', facCode: 'FAC-CS-01', p: 3 },
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS302', facCode: 'FAC-CS-02', p: 3 },
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS303', facCode: 'FAC-CS-03', p: 3 },
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS304', facCode: 'FAC-CS-04', p: 3 },
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS305L', facCode: 'FAC-CS-05', p: 2 },
    { deptCode: 'CSE', secName: 'Section A', courseCode: 'CS306L', facCode: 'FAC-CS-06', p: 2 },

    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS301', facCode: 'FAC-CS-01', p: 3 },
    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS302', facCode: 'FAC-CS-02', p: 3 },
    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS303', facCode: 'FAC-CS-03', p: 3 },
    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS304', facCode: 'FAC-CS-04', p: 3 },
    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS305L', facCode: 'FAC-CS-05', p: 2 },
    { deptCode: 'CSE', secName: 'Section B', courseCode: 'CS306L', facCode: 'FAC-CS-06', p: 2 },

    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS901', facCode: 'FAC-CS-04', p: 3 },
    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS301', facCode: 'FAC-CS-01', p: 3 },
    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS302', facCode: 'FAC-CS-02', p: 3 },
    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS303', facCode: 'FAC-CS-03', p: 3 },
    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS305L', facCode: 'FAC-CS-05', p: 2 },
    { deptCode: 'CSE', secName: 'Dual-Degree AI', courseCode: 'CS306L', facCode: 'FAC-CS-06', p: 2 },

    // ECE Subjects (6 subjects)
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC301', facCode: 'FAC-EC-01', p: 3 },
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC302', facCode: 'FAC-EC-02', p: 3 },
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC303', facCode: 'FAC-EC-03', p: 3 },
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC304', facCode: 'FAC-EC-04', p: 3 },
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC305L', facCode: 'FAC-EC-05', p: 2 },
    { deptCode: 'ECE', secName: 'Section A', courseCode: 'EC306L', facCode: 'FAC-EC-02', p: 2 },

    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC301', facCode: 'FAC-EC-01', p: 3 },
    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC302', facCode: 'FAC-EC-02', p: 3 },
    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC303', facCode: 'FAC-EC-03', p: 3 },
    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC304', facCode: 'FAC-EC-04', p: 3 },
    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC305L', facCode: 'FAC-EC-05', p: 2 },
    { deptCode: 'ECE', secName: 'Section B', courseCode: 'EC306L', facCode: 'FAC-EC-02', p: 2 },

    // MECH Subjects (6 subjects)
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME301', facCode: 'FAC-ME-01', p: 3 },
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME302', facCode: 'FAC-ME-02', p: 3 },
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME303', facCode: 'FAC-ME-03', p: 3 },
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME304', facCode: 'FAC-ME-04', p: 3 },
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME305L', facCode: 'FAC-ME-05', p: 2 },
    { deptCode: 'MECH', secName: 'Section A', courseCode: 'ME306L', facCode: 'FAC-ME-02', p: 2 },

    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME301', facCode: 'FAC-ME-01', p: 3 },
    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME302', facCode: 'FAC-ME-02', p: 3 },
    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME303', facCode: 'FAC-ME-03', p: 3 },
    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME304', facCode: 'FAC-ME-04', p: 3 },
    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME305L', facCode: 'FAC-ME-05', p: 2 },
    { deptCode: 'MECH', secName: 'Section B', courseCode: 'ME306L', facCode: 'FAC-ME-02', p: 2 },

    // EE Subjects (6 subjects)
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE301', facCode: 'FAC-EE-01', p: 3 },
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE302', facCode: 'FAC-EE-02', p: 3 },
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE303', facCode: 'FAC-EE-03', p: 3 },
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE304', facCode: 'FAC-EE-04', p: 3 },
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE305L', facCode: 'FAC-EE-05', p: 2 },
    { deptCode: 'EE', secName: 'Section A', courseCode: 'EE306L', facCode: 'FAC-EE-03', p: 2 },

    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE301', facCode: 'FAC-EE-01', p: 3 },
    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE302', facCode: 'FAC-EE-02', p: 3 },
    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE303', facCode: 'FAC-EE-03', p: 3 },
    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE304', facCode: 'FAC-EE-04', p: 3 },
    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE305L', facCode: 'FAC-EE-05', p: 2 },
    { deptCode: 'EE', secName: 'Section B', courseCode: 'EE306L', facCode: 'FAC-EE-03', p: 2 },

    // CE Subjects (6 subjects, including Section C!)
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE301', facCode: 'FAC-CE-01', p: 3 },
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE302', facCode: 'FAC-CE-02', p: 3 },
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE303', facCode: 'FAC-CE-03', p: 3 },
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE304', facCode: 'FAC-CE-04', p: 3 },
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE305L', facCode: 'FAC-CE-05', p: 2 },
    { deptCode: 'CE', secName: 'Section A', courseCode: 'CE306L', facCode: 'FAC-CE-06', p: 2 },

    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE301', facCode: 'FAC-CE-01', p: 3 },
    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE302', facCode: 'FAC-CE-02', p: 3 },
    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE303', facCode: 'FAC-CE-03', p: 3 },
    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE304', facCode: 'FAC-CE-04', p: 3 },
    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE305L', facCode: 'FAC-CE-05', p: 2 },
    { deptCode: 'CE', secName: 'Section B', courseCode: 'CE306L', facCode: 'FAC-CE-06', p: 2 },

    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE301', facCode: 'FAC-CE-01', p: 3 },
    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE302', facCode: 'FAC-CE-02', p: 3 },
    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE303', facCode: 'FAC-CE-03', p: 3 },
    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE304', facCode: 'FAC-CE-04', p: 3 },
    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE305L', facCode: 'FAC-CE-05', p: 2 },
    { deptCode: 'CE', secName: 'Section C', courseCode: 'CE306L', facCode: 'FAC-CE-06', p: 2 },
  ];

  for (const m of teachingMappings) {
    const sec = await queryOne<{ id: string }>(
      'SELECT s.id FROM sections s JOIN departments d ON d.id = s.department_id WHERE d.code = ? AND s.name = ?',
      [m.deptCode, m.secName]
    );
    const crs = await queryOne<{ id: string }>('SELECT id FROM courses WHERE code = ?', [m.courseCode]);
    const fac = await queryOne<{ id: string }>('SELECT id FROM faculty WHERE code = ? OR id = ?', [m.facCode, m.facCode]);

    if (!sec || !crs || !fac) {
      console.warn(`[Skip assignment] Could not resolve: dept=${m.deptCode}, sec=${m.secName}, crs=${m.courseCode}, fac=${m.facCode}`);
      continue;
    }

    const existing = await queryOne(
      'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
      [sec.id, crs.id]
    );
    if (existing) {
      await execute(
        'UPDATE teaching_assignments SET faculty_id = ?, periods_per_week = ? WHERE id = ?',
        [fac.id, m.p, existing.id]
      );
    } else {
      const taId = 'ta_' + Math.random().toString(36).substring(2, 10);
      await execute(
        'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week) VALUES (?, ?, ?, ?, ?)',
        [taId, sec.id, crs.id, fac.id, m.p]
      );
    }
  }

  // 8. Exam Schedule & Seating Demo Students
  const existingExam = await queryOne('SELECT id FROM exam_schedules WHERE id = ?', ['exam_midterm_2026']);
  if (!existingExam) {
    await execute(
      'INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)',
      ['exam_midterm_2026', 'Mid-Term Examinations Autumn 2026', '2026-10-25', 'Morning (09:30-12:30)']
    );
  }

  const existingStudents = await queryOne<{ count: number }>('SELECT count(*) as count FROM students');
  if (Number(existingStudents?.count || 0) < 36) {
    for (let i = 1; i <= 18; i++) {
      const pad = String(i).padStart(3, '0');
      await execute(
        'INSERT OR IGNORE INTO students (id, roll_number, name, department_id, semester) VALUES (?, ?, ?, ?, ?)',
        [`stu_cse_${i}`, `2026-CSE-${pad}`, `CSE Student ${i}`, 'dept_cse', 5]
      );
      await execute(
        'INSERT OR IGNORE INTO students (id, roll_number, name, department_id, semester) VALUES (?, ?, ?, ?, ?)',
        [`stu_ece_${i}`, `2026-ECE-${pad}`, `ECE Student ${i}`, 'dept_ece', 5]
      );
    }
  }

  console.log('🎉 Comprehensive institutional database initialization complete!');
}

initDb().catch((e) => {
  console.error('Database initialization error:', e);
  process.exit(1);
});
