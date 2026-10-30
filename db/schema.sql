-- ============================================================================
-- Single-College Academic Scheduler Schema (Pure SQL - PostgreSQL & SQLite compatible)
-- ============================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN', -- 'ADMIN', 'FACULTY', 'STAFF'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'CSE', 'ECE', 'MECH'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rooms & Lecture Halls
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'LH-101', 'CS-LAB'
    name VARCHAR(255) NOT NULL,       -- e.g. 'Aryabhatta Lecture Hall'
    building VARCHAR(100) NOT NULL DEFAULT 'Main Block',
    floor INT NOT NULL DEFAULT 1,
    type VARCHAR(50) NOT NULL DEFAULT 'LECTURE_HALL', -- 'LECTURE_HALL', 'CLASSROOM', 'COMPUTER_LAB', 'SEMINAR_HALL'
    rows INT NOT NULL DEFAULT 6,
    cols INT NOT NULL DEFAULT 5,
    capacity INT NOT NULL,            -- Total capacity = rows * cols
    is_available BOOLEAN NOT NULL DEFAULT 1,
    time_off TEXT DEFAULT NULL,       -- JSON: Record<DayOfWeek, (0|1|2)[]>
    color VARCHAR(20) DEFAULT NULL,   -- Hex or Tailwind color tag
    department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Faculty Directory
CREATE TABLE IF NOT EXISTS faculty (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'FAC-CS-01'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
    department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    max_daily_periods INT NOT NULL DEFAULT 4,
    max_weekly_periods INT NOT NULL DEFAULT 18,
    time_off TEXT DEFAULT NULL,       -- JSON: Record<DayOfWeek, (0|1|2)[]>
    color VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Courses
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'CS301'
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    periods_per_week INT NOT NULL DEFAULT 3,
    span INT NOT NULL DEFAULT 1,       -- 1 for theory, 2-3 for lab sessions
    lesson_format VARCHAR(20) DEFAULT '1_AT_A_TIME', -- '1_AT_A_TIME', '1_AND_2_MIX', '2_AT_A_TIME', '3_AT_A_TIME'
    time_off TEXT DEFAULT NULL,       -- JSON: Record<DayOfWeek, (0|1|2)[]>
    color VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Students
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    roll_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. '2026-CSE-001'
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Classroom Timetable Sessions
CREATE TABLE IF NOT EXISTS class_sessions (
    id VARCHAR(36) PRIMARY KEY,
    day VARCHAR(20) NOT NULL,          -- 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
    period_index INT NOT NULL,         -- 1 to 8 (e.g., 09:00 - 17:00)
    span INT NOT NULL DEFAULT 1,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id VARCHAR(36) NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL, -- e.g. 'Section A', 'Year 2'
    batch VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'ALL', 'Batch 1', 'Batch 2'
    is_pinned BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- PHYSICAL COLLISION BARRIERS (Database-enforced integrity)
    CONSTRAINT uq_room_slot UNIQUE (room_id, day, period_index),
    CONSTRAINT uq_faculty_slot UNIQUE (faculty_id, day, period_index)
);

-- 8. Exam Schedules
CREATE TABLE IF NOT EXISTS exam_schedules (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,       -- e.g. 'Mid-Term Examinations Autumn 2026'
    date VARCHAR(50) NOT NULL,
    slot VARCHAR(50) NOT NULL,         -- 'Morning (09:30-12:30)' or 'Afternoon (14:00-17:00)'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Seat Allocations
CREATE TABLE IF NOT EXISTS seat_allocations (
    id VARCHAR(36) PRIMARY KEY,
    exam_schedule_id VARCHAR(36) NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    row_num INT NOT NULL,
    col_num INT NOT NULL,
    seat_label VARCHAR(20) NOT NULL,   -- e.g. 'R1-S3'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- PHYSICAL DESK UNIQUENESS & STUDENT EXAM UNIQUENESS
    CONSTRAINT uq_desk_slot UNIQUE (exam_schedule_id, room_id, row_num, col_num),
    CONSTRAINT uq_student_exam UNIQUE (exam_schedule_id, student_id)
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_sessions_day_period ON class_sessions(day, period_index);
CREATE INDEX IF NOT EXISTS idx_sessions_faculty ON class_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON class_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_seat_allocations_room ON seat_allocations(exam_schedule_id, room_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_rooms_dept ON rooms(department_id);

-- 10. Student Sections & Strengths
CREATE TABLE IF NOT EXISTS sections (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,          -- e.g. 'Section A', 'Section B'
    department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INT NOT NULL DEFAULT 3,
    strength INT NOT NULL DEFAULT 60,   -- Student capacity / strength
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
    time_off TEXT DEFAULT NULL,       -- JSON: Record<DayOfWeek, (0|1|2)[]>
    color VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_section_sem UNIQUE (department_id, name, semester)
);

-- 11. Faculty Course & Section Teaching Allocations (Mapping)
CREATE TABLE IF NOT EXISTS teaching_assignments (
    id VARCHAR(36) PRIMARY KEY,
    section_id VARCHAR(36) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id VARCHAR(36) NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    periods_per_week INT NOT NULL DEFAULT 3,
    batch VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'ALL', 'Batch 1', 'Batch 2'
    lesson_format VARCHAR(20) DEFAULT 'DEFAULT', -- 'DEFAULT', '1_AT_A_TIME', '1_AND_2_MIX', '2_AT_A_TIME', '3_AT_A_TIME'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_section_course_batch UNIQUE (section_id, course_id, batch)
);

CREATE INDEX IF NOT EXISTS idx_sections_dept ON sections(department_id);
CREATE INDEX IF NOT EXISTS idx_assignments_section ON teaching_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty ON teaching_assignments(faculty_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_section ON class_sessions(section_name);
CREATE INDEX IF NOT EXISTS idx_students_dept_sem ON students(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_seat_alloc_student ON seat_allocations(student_id);
