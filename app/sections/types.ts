export interface Section {
  id: string;
  name: string;
  department_id: string;
  semester: number;
  strength: number;
  academic_year: string;
  department_name: string;
  department_code: string;
  assigned_courses_count: number;
  time_off?: string | null;
  color?: string | null;
}

export interface Allocation {
  id: string;
  section_id: string;
  course_id: string;
  faculty_id: string;
  periods_per_week: number;
  batch?: string;
  lesson_format?: string;
  course_lesson_format?: string;
  created_at: string;
  section_name: string;
  semester: number;
  section_strength: number;
  department_id: string;
  department_name: string;
  department_code: string;
  course_code: string;
  course_name: string;
  course_span: number;
  faculty_code: string;
  faculty_name: string;
  faculty_designation: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department_id: string;
  semester: number;
  periods_per_week: number;
  span: number;
  lesson_format?: '1_AT_A_TIME' | '1_AND_2_MIX' | '2_AT_A_TIME' | '3_AT_A_TIME';
  department_name?: string;
  department_code?: string;
}

export interface Faculty {
  id: string;
  code: string;
  name: string;
  designation: string;
  department_id: string;
}

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
