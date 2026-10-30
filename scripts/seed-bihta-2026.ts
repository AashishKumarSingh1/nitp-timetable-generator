// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'scheduler.db');
const db = new DatabaseSync(DB_PATH);

console.log('🌱 Starting NIT Patna Bihta Campus 2025-26 Even Semester Seeding...');

// Enable foreign keys
db.exec('PRAGMA foreign_keys = OFF;');

// Ensure tables have required columns
try {
  db.exec("ALTER TABLE courses ADD COLUMN lesson_format VARCHAR(20) DEFAULT '1_AT_A_TIME';");
} catch {}
try {
  db.exec("ALTER TABLE teaching_assignments ADD COLUMN lesson_format VARCHAR(20) DEFAULT 'DEFAULT';");
} catch {}

// 1. Departments Check
const deptCse = db.prepare("SELECT id FROM departments WHERE id = 'dept_cse' OR code = 'CSE'").get() as { id: string } | undefined;
const deptEce = db.prepare("SELECT id FROM departments WHERE id = 'dept_ece' OR code = 'ECE'").get() as { id: string } | undefined;

const CSE_DEPT_ID = deptCse ? deptCse.id : 'dept_cse';
const ECE_DEPT_ID = deptEce ? deptEce.id : 'dept_ece';

// 2. Real CSE Faculty Members (18 Faculty Members from Bihta Campus)
interface FacultyDef {
  id: string;
  code: string;
  name: string;
  email: string;
  designation: string;
  department_id: string;
  max_daily_periods: number;
  max_weekly_periods: number;
}

const REAL_FACULTY: FacultyDef[] = [
  { id: 'fac_cse_aks', code: 'FAC-CSE-AKS', name: 'Dr. Amit Kumar Singh', email: 'aksingh@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_mps', code: 'FAC-CSE-MPS', name: 'Prof. M. P. Singh', email: 'mps@nitp.ac.in', designation: 'Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 16 },
  { id: 'fac_cse_jps', code: 'FAC-CSE-JPS', name: 'Dr. J .P. Singh', email: 'jps@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_upr', code: 'FAC-CSE-UPR', name: 'Dr. Udai Pratap Rao', email: 'udai@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_kc',  code: 'FAC-CSE-KC',  name: 'Dr. Kakali Chatterjee', email: 'kakali@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_akd', code: 'FAC-CSE-AKD', name: 'Dr. Anil Kumar Dudyala', email: 'anild@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_dd',  code: 'FAC-CSE-DD',  name: 'Dr. Dinesh Dash', email: 'ddash@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_sd',  code: 'FAC-CSE-SD',  name: 'Dr. Suddhasil De', email: 'suddhasil@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_ss',  code: 'FAC-CSE-SS',  name: 'Dr. Somaraju Suvvari', email: 'somaraju@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_mk',  code: 'FAC-CSE-MK',  name: 'Dr. Mukesh Kumar', email: 'mukesh.kumar@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_bm',  code: 'FAC-CSE-BM',  name: 'Dr. Bhaskar Mandal', email: 'bhaskar@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_ds',  code: 'FAC-CSE-DS',  name: 'Dr. Ditipriya Sinha', email: 'ditipriya@nitp.ac.in', designation: 'Associate Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_bbn', code: 'FAC-CSE-BBN', name: 'Dr. B. Balaji Naik', email: 'balajinaik@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_kks', code: 'FAC-CSE-KKS', name: 'Dr. Krishna Kumar Sethi', email: 'kksethi@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_ag',  code: 'FAC-CSE-AG',  name: 'Dr. Antriksh Goswami', email: 'antriksh@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_skt', code: 'FAC-CSE-SKT', name: 'Dr. Santosh Kumar Tripathy', email: 'sktripathy@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_ak',  code: 'FAC-CSE-AK',  name: 'Dr. Abhimanyu Kumar', email: 'abhimanyu@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
  { id: 'fac_cse_dm',  code: 'FAC-CSE-DM',  name: 'Dr. Dashrath Mahto', email: 'dmahto@nitp.ac.in', designation: 'Assistant Professor', department_id: CSE_DEPT_ID, max_daily_periods: 4, max_weekly_periods: 18 },
];

console.log(`Inserting/Updating ${REAL_FACULTY.length} real CSE faculty members...`);
const insertFacultyStmt = db.prepare(`
  INSERT INTO faculty (id, department_id, code, name, designation, email, max_daily_periods, max_weekly_periods)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    department_id = excluded.department_id,
    code = excluded.code,
    name = excluded.name,
    designation = excluded.designation,
    email = excluded.email,
    max_daily_periods = excluded.max_daily_periods,
    max_weekly_periods = excluded.max_weekly_periods
`);

for (const f of REAL_FACULTY) {
  insertFacultyStmt.run(f.id, f.department_id, f.code, f.name, f.designation, f.email, f.max_daily_periods, f.max_weekly_periods);
}

// 3. Academic Sections for 2025-26 Even Semester
interface SectionDef {
  id: string;
  name: string;
  department_id: string;
  semester: number;
  strength: number;
  academic_year: string;
}

const EVEN_SEMESTER_SECTIONS: SectionDef[] = [
  // 4th Sem B.Tech (UG 2nd Year)
  { id: 'sec_cse_4a', name: 'CSE-I (Sem 4)', department_id: CSE_DEPT_ID, semester: 4, strength: 80, academic_year: '2025-26' },
  { id: 'sec_cse_4b', name: 'CSE-II (Sem 4)', department_id: CSE_DEPT_ID, semester: 4, strength: 80, academic_year: '2025-26' },
  { id: 'sec_cse_4c', name: 'CSE-III+DD (Sem 4)', department_id: CSE_DEPT_ID, semester: 4, strength: 80, academic_year: '2025-26' },

  // 6th Sem B.Tech (UG 3rd Year)
  { id: 'sec_cse_6a', name: 'CSE-I (Sem 6)', department_id: CSE_DEPT_ID, semester: 6, strength: 75, academic_year: '2025-26' },
  { id: 'sec_cse_6b', name: 'CSE-II (Sem 6)', department_id: CSE_DEPT_ID, semester: 6, strength: 75, academic_year: '2025-26' },
  { id: 'sec_cse_6c', name: 'CSE-III+DD (Sem 6)', department_id: CSE_DEPT_ID, semester: 6, strength: 75, academic_year: '2025-26' },

  // 8th Sem Dual Degree & 2nd Sem M.Tech Advanced PG Cohorts
  { id: 'sec_cse_8_ds', name: 'DD+M.Tech DS (Sem 8/2)', department_id: CSE_DEPT_ID, semester: 8, strength: 35, academic_year: '2025-26' },
  { id: 'sec_cse_8_cs', name: 'DD+M.Tech CS (Sem 8/2)', department_id: CSE_DEPT_ID, semester: 8, strength: 35, academic_year: '2025-26' },

  // ECE Servicing Cohorts (taught by CSE Department for OOPs CS45101)
  { id: 'sec_ece_4a', name: 'ECE-I (Sem 4)', department_id: ECE_DEPT_ID, semester: 4, strength: 70, academic_year: '2025-26' },
  { id: 'sec_ece_4b', name: 'ECE-II (Sem 4)', department_id: ECE_DEPT_ID, semester: 4, strength: 70, academic_year: '2025-26' },
];

console.log(`Inserting/Updating ${EVEN_SEMESTER_SECTIONS.length} Even Semester academic sections...`);
const insertSectionStmt = db.prepare(`
  INSERT INTO sections (id, name, department_id, semester, strength, academic_year)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    department_id = excluded.department_id,
    semester = excluded.semester,
    strength = excluded.strength,
    academic_year = excluded.academic_year
`);

for (const s of EVEN_SEMESTER_SECTIONS) {
  insertSectionStmt.run(s.id, s.name, s.department_id, s.semester, s.strength, s.academic_year);
}

// 4. Real Courses with L-T-P, Periods, Spans, and Lesson Formats
interface CourseDef {
  id: string;
  code: string;
  name: string;
  department_id: string;
  semester: number;
  periods_per_week: number;
  span: number;
  lesson_format: string;
}

const REAL_COURSES: CourseDef[] = [
  // 4th Semester Subjects
  { id: 'c_cs44112', code: 'CS44112', name: 'Artificial Intelligence', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs44112_th', code: 'CS44112-TH', name: 'Artificial Intelligence (Theory)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs44112_pr', code: 'CS44112-PR', name: 'Artificial Intelligence (Lab)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

  { id: 'c_cs44113', code: 'CS44113', name: 'Computer Networks', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs44113_th', code: 'CS44113-TH', name: 'Computer Networks (Theory)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs44113_pr', code: 'CS44113-PR', name: 'Computer Networks (Lab)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

  { id: 'c_cs44114', code: 'CS44114', name: 'Automata Theory and Compiler Design', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs44114_th', code: 'CS44114-TH', name: 'Automata Theory and Compiler Design (Theory)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs44114_pr', code: 'CS44114-PR', name: 'Automata Theory and Compiler Design (Lab)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

  { id: 'c_cs44115', code: 'CS44115', name: 'Design and Analysis of Algorithms', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs44115_th', code: 'CS44115-TH', name: 'Design and Analysis of Algorithms (Theory)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs44115_pr', code: 'CS44115-PR', name: 'Design and Analysis of Algorithms (Lab)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },

  { id: 'c_cs44164', code: 'CS44164', name: 'Computer System Parallelism', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs44146', code: 'CS44146', name: 'Operations Research', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

  // 6th Semester Subjects
  { id: 'c_cs64120', code: 'CS64120', name: 'Data Mining', department_id: CSE_DEPT_ID, semester: 6, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs64121', code: 'CS64121', name: 'Cloud Computing', department_id: CSE_DEPT_ID, semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs64163', code: 'CS64163', name: 'Recommendation Systems', department_id: CSE_DEPT_ID, semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs64161', code: 'CS64161', name: 'Blockchain Technology', department_id: CSE_DEPT_ID, semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs64158', code: 'CS64158', name: 'Distributed Systems', department_id: CSE_DEPT_ID, semester: 6, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

  // 8th Semester / M.Tech 2nd Semester Electives & Advanced Subjects
  { id: 'c_cs84130', code: 'CS84130', name: 'Natural Language Processing', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84131', code: 'CS84131', name: 'Deep Learning', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84132', code: 'CS84132', name: 'Data Visualization Techniques', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84138', code: 'CS84138', name: 'Intrusion Detection and Prevention', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84139', code: 'CS84139', name: 'Advanced Internet of Things (IoT)', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84140', code: 'CS84140', name: 'Cyber Forensics', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs84190', code: 'CS84190', name: 'Federated Learning', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs84284', code: 'CS84284', name: 'Computational Geometry', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },

  // ECE Servicing Courses
  { id: 'c_cs45101', code: 'CS45101', name: 'Object Oriented Programming', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 5, span: 2, lesson_format: '1_AND_2_MIX' },
  { id: 'c_cs45101_th', code: 'CS45101-TH', name: 'Object Oriented Programming (Theory)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
  { id: 'c_cs45101_pr', code: 'CS45101-PR', name: 'Object Oriented Programming (Lab)', department_id: CSE_DEPT_ID, semester: 4, periods_per_week: 2, span: 2, lesson_format: '2_AT_A_TIME' },
  { id: 'c_cs85101', code: 'CS85101', name: 'Open Elective Deep Learning (ECE)', department_id: CSE_DEPT_ID, semester: 8, periods_per_week: 3, span: 1, lesson_format: '1_AT_A_TIME' },
];

console.log(`Inserting/Updating ${REAL_COURSES.length} curriculum courses...`);
const insertCourseStmt = db.prepare(`
  INSERT INTO courses (id, code, name, department_id, semester, periods_per_week, span, lesson_format)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    code = excluded.code,
    name = excluded.name,
    department_id = excluded.department_id,
    semester = excluded.semester,
    periods_per_week = excluded.periods_per_week,
    span = excluded.span,
    lesson_format = excluded.lesson_format
`);

for (const c of REAL_COURSES) {
  insertCourseStmt.run(c.id, c.code, c.name, c.department_id, c.semester, c.periods_per_week, c.span, c.lesson_format);
}

// 5. Teaching Assignments (46 Real Allocations from Excel)
interface AssignmentDef {
  section_id: string;
  course_id: string;
  faculty_id: string;
  periods_per_week: number;
  lesson_format: string;
}

const ALLOCATIONS: AssignmentDef[] = [
  // ==================== CSUG-I 4th Sem ====================
  // Artificial Intelligence: Theory (Dr. Udai Pratap Rao, 3h), Lab (Dr. Somaraju Suvvari, 2h)
  { section_id: 'sec_cse_4a', course_id: 'c_cs44112_th', faculty_id: 'fac_cse_upr', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_cse_4a', course_id: 'c_cs44112_pr', faculty_id: 'fac_cse_ss',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Computer Networks: Theory (Dr. Amit Kumar Singh, 3h), Lab (Dr. Dashrath Mahto, 2h)
  { section_id: 'sec_cse_4a', course_id: 'c_cs44113_th', faculty_id: 'fac_cse_aks', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_cse_4a', course_id: 'c_cs44113_pr', faculty_id: 'fac_cse_dm',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Automata Theory: Dr. Dinesh Dash (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4a', course_id: 'c_cs44114',    faculty_id: 'fac_cse_dd',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Algorithms: Dr. Abhimanyu Kumar (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4a', course_id: 'c_cs44115',    faculty_id: 'fac_cse_ak',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Dept Elective - Computer System Parallelism: Dr. Suddhasil De (3h Theory)
  { section_id: 'sec_cse_4a', course_id: 'c_cs44164',    faculty_id: 'fac_cse_sd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== CSUG-II 4th Sem ====================
  // Artificial Intelligence: Dr. Mukesh Kumar (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4b', course_id: 'c_cs44112',    faculty_id: 'fac_cse_mk',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Computer Networks: Dr. Dashrath Mahto (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4b', course_id: 'c_cs44113',    faculty_id: 'fac_cse_dm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Automata Theory: Theory (Dr. B. Balaji Naik, 3h), Lab (Dr. Bhaskar Mandal, 2h)
  { section_id: 'sec_cse_4b', course_id: 'c_cs44114_th', faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_cse_4b', course_id: 'c_cs44114_pr', faculty_id: 'fac_cse_bm',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Algorithms: Theory (Dr. Abhimanyu Kumar / Prof M.P. Singh, 3h), Lab (Dr. Antriksh Goswami, 2h)
  { section_id: 'sec_cse_4b', course_id: 'c_cs44115_th', faculty_id: 'fac_cse_ak',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_cse_4b', course_id: 'c_cs44115_pr', faculty_id: 'fac_cse_ag',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Dept Elective - Operations Research: Dr. B. Balaji Naik (3h Theory)
  { section_id: 'sec_cse_4b', course_id: 'c_cs44146',    faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== CSUG-III + DD 4th Sem ====================
  // Artificial Intelligence: Dr. Mukesh Kumar (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4c', course_id: 'c_cs44112',    faculty_id: 'fac_cse_mk',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Computer Networks: Dr. Dashrath Mahto (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4c', course_id: 'c_cs44113',    faculty_id: 'fac_cse_dm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Automata Theory: Dr. Krishna Kumar Sethi (3h Theory + 2h Lab)
  { section_id: 'sec_cse_4c', course_id: 'c_cs44114',    faculty_id: 'fac_cse_kks', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Algorithms: Theory (Prof. M. P. Singh / Dr. Sethi, 3h), Lab (Dr. Dinesh Dash, 2h)
  { section_id: 'sec_cse_4c', course_id: 'c_cs44115_th', faculty_id: 'fac_cse_mps', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_cse_4c', course_id: 'c_cs44115_pr', faculty_id: 'fac_cse_dd',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Dept Elective - Operations Research: Dr. B. Balaji Naik (3h Theory)
  { section_id: 'sec_cse_4c', course_id: 'c_cs44146',    faculty_id: 'fac_cse_bbn', periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== CSUG-I 6th Sem ====================
  // Data Mining: Dr. Anil Kumar Dudyala (3h Theory + 2h Lab)
  { section_id: 'sec_cse_6a', course_id: 'c_cs64120',    faculty_id: 'fac_cse_akd', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Cloud Computing: Dr. Kakali Chatterjee (3h Theory)
  { section_id: 'sec_cse_6a', course_id: 'c_cs64121',    faculty_id: 'fac_cse_kc',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Recommendation Systems: Dr. Somaraju Suvvari (3h Theory)
  { section_id: 'sec_cse_6a', course_id: 'c_cs64163',    faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Blockchain Technology: Dr. Ditipriya Sinha (3h Theory)
  { section_id: 'sec_cse_6a', course_id: 'c_cs64161',    faculty_id: 'fac_cse_ds',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== CSUG-II 6th Sem ====================
  // Data Mining: Dr. Anil Kumar Dudyala (3h Theory + 2h Lab)
  { section_id: 'sec_cse_6b', course_id: 'c_cs64120',    faculty_id: 'fac_cse_akd', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Cloud Computing: Dr. Antriksh Goswami (3h Theory)
  { section_id: 'sec_cse_6b', course_id: 'c_cs64121',    faculty_id: 'fac_cse_ag',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Recommendation Systems: Dr. Somaraju Suvvari (3h Theory)
  { section_id: 'sec_cse_6b', course_id: 'c_cs64163',    faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== CSUG-III + DD 6th Sem ====================
  // Data Mining: Dr. Santosh Kumar Tripathy (3h Theory + 2h Lab)
  { section_id: 'sec_cse_6c', course_id: 'c_cs64120',    faculty_id: 'fac_cse_skt', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Cloud Computing: Dr. Antriksh Goswami (3h Theory)
  { section_id: 'sec_cse_6c', course_id: 'c_cs64121',    faculty_id: 'fac_cse_ag',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Distributed Systems: Dr. Suddhasil De (3h Theory)
  { section_id: 'sec_cse_6c', course_id: 'c_cs64158',    faculty_id: 'fac_cse_sd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== DD + M.Tech (Data Science) 8th / 2nd Sem ====================
  // Natural Language Processing: Dr. J. P. Singh (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_ds', course_id: 'c_cs84130',   faculty_id: 'fac_cse_jps', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Deep Learning: Dr. Bhaskar Mandal (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_ds', course_id: 'c_cs84131',   faculty_id: 'fac_cse_bm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Data Visualization Techniques: Dr. Santosh Kumar Tripathy (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_ds', course_id: 'c_cs84132',   faculty_id: 'fac_cse_skt', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Federated Learning: Dr. Somaraju Suvvari (3h Theory)
  { section_id: 'sec_cse_8_ds', course_id: 'c_cs84190',   faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Computational Geometry: Dr. Dinesh Dash (3h Theory)
  { section_id: 'sec_cse_8_ds', course_id: 'c_cs84284',   faculty_id: 'fac_cse_dd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== DD + M.Tech (Cyber Security) 8th / 2nd Sem ====================
  // Intrusion Detection and Prevention: Dr. Kakali Chatterjee (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_cs', course_id: 'c_cs84138',   faculty_id: 'fac_cse_kc',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Advanced Internet of Things: Dr. Bhaskar Mandal (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_cs', course_id: 'c_cs84139',   faculty_id: 'fac_cse_bm',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Cyber Forensics: Dr. Udai Pratap Rao (3h Theory + 2h Lab)
  { section_id: 'sec_cse_8_cs', course_id: 'c_cs84140',   faculty_id: 'fac_cse_upr', periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Federated Learning: Dr. Somaraju Suvvari (3h Theory)
  { section_id: 'sec_cse_8_cs', course_id: 'c_cs84190',   faculty_id: 'fac_cse_ss',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  // Computational Geometry: Dr. Dinesh Dash (3h Theory)
  { section_id: 'sec_cse_8_cs', course_id: 'c_cs84284',   faculty_id: 'fac_cse_dd',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },

  // ==================== ECE 4th Sem (Servicing Courses) ====================
  // Object Oriented Programming (ECE-I): Dr. Ditipriya Sinha (3h Theory + 2h Lab)
  { section_id: 'sec_ece_4a', course_id: 'c_cs45101',     faculty_id: 'fac_cse_ds',  periods_per_week: 5, lesson_format: '1_AND_2_MIX' },
  // Object Oriented Programming (ECE-II): Theory (Dr. Ditipriya Sinha, 3h), Lab (Dr. Suddhasil De, 2h)
  { section_id: 'sec_ece_4b', course_id: 'c_cs45101_th',  faculty_id: 'fac_cse_ds',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
  { section_id: 'sec_ece_4b', course_id: 'c_cs45101_pr',  faculty_id: 'fac_cse_sd',  periods_per_week: 2, lesson_format: '2_AT_A_TIME' },
  // Open Elective Deep Learning for Dual Degree ECE 8th Sem: Dr. Bhaskar Mandal (3h Theory)
  { section_id: 'sec_ece_4a', course_id: 'c_cs85101',     faculty_id: 'fac_cse_bm',  periods_per_week: 3, lesson_format: '1_AT_A_TIME' },
];

console.log(`Clearing old sessions, synthetic teaching assignments, and synthetic sections...`);
// Clear old synthetic data
db.exec(`
  DELETE FROM class_sessions;
  DELETE FROM teaching_assignments;
  DELETE FROM sections WHERE academic_year != '2025-26';
  DELETE FROM courses WHERE id LIKE 'crs_%';
`);

console.log(`Inserting ${ALLOCATIONS.length} real teaching assignments...`);
const insertAllocStmt = db.prepare(`
  INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, batch, lesson_format)
  VALUES (?, ?, ?, ?, ?, 'ALL', ?)
`);

for (const a of ALLOCATIONS) {
  const id = crypto.randomUUID();
  insertAllocStmt.run(id, a.section_id, a.course_id, a.faculty_id, a.periods_per_week, a.lesson_format);
}

// Re-enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

console.log('✅ Real NIT Patna Bihta Campus 2025-26 Even Semester Data successfully fed!');
console.log(`   - Faculty Members: ${REAL_FACULTY.length}`);
console.log(`   - Academic Sections: ${EVEN_SEMESTER_SECTIONS.length}`);
console.log(`   - Curriculum Courses: ${REAL_COURSES.length}`);
console.log(`   - Teaching Allocations: ${ALLOCATIONS.length}`);
console.log(`   - Total Weekly Teaching Load: ${ALLOCATIONS.reduce((acc, a) => acc + a.periods_per_week, 0)} hours`);
