import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import crypto from 'node:crypto';

// Ensure courses table has semester and lesson_format columns
async function ensureCourseSchema() {
  try {
    await execute('ALTER TABLE courses ADD COLUMN semester INT NOT NULL DEFAULT 3');
  } catch {}
  try {
    await execute("ALTER TABLE courses ADD COLUMN lesson_format VARCHAR(20) DEFAULT '1_AT_A_TIME'");
  } catch {}
}

export async function GET(req: NextRequest) {
  try {
    await ensureCourseSchema();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const semester = searchParams.get('semester');

    let sql = `
      SELECT c.id, c.code, c.name, c.department_id, c.semester, c.periods_per_week, c.span, c.lesson_format,
             d.name AS department_name, d.code AS department_code
      FROM courses c
      LEFT JOIN departments d ON d.id = c.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      sql += ' AND c.department_id = ?';
      params.push(departmentId);
    }
    if (semester) {
      sql += ' AND c.semester = ?';
      params.push(Number(semester));
    }

    sql += ' ORDER BY d.code ASC, c.semester ASC, c.code ASC';

    const courses = await query(sql, params);
    return NextResponse.json({ courses });
  } catch (err: any) {
    console.error('Fetch courses error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureCourseSchema();
    const body = await req.json();
    const {
      code,
      name,
      department_id,
      semester = 3,
      periods_per_week = 3,
      span = 1,
      lesson_format = '1_AT_A_TIME',
    } = body;

    if (!code || !name || !department_id) {
      return NextResponse.json(
        { error: 'Course code, name, and department are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO courses (id, code, name, department_id, semester, periods_per_week, span, lesson_format)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code.trim().toUpperCase(),
        name.trim(),
        department_id,
        Number(semester) || 3,
        Number(periods_per_week) || 3,
        Number(span) || 1,
        lesson_format || '1_AT_A_TIME',
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create course error:', err);
    if (err.message?.includes('UNIQUE') || err.message?.includes('courses.code')) {
      return NextResponse.json(
        { error: 'A course with this course code already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
