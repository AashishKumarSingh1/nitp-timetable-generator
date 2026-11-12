import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import crypto from 'node:crypto';

// Ensure table exists on first query
async function ensureTables() {
  await execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      department_id VARCHAR(36) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      semester INT NOT NULL DEFAULT 3,
      strength INT NOT NULL DEFAULT 60,
      academic_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
      lunch_after_period INT NOT NULL DEFAULT 4,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_dept_section_sem UNIQUE (department_id, name, semester)
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS teaching_assignments (
      id VARCHAR(36) PRIMARY KEY,
      section_id VARCHAR(36) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      faculty_id VARCHAR(36) NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
      periods_per_week INT NOT NULL DEFAULT 3,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_section_course UNIQUE (section_id, course_id)
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');

    let sql = `
      SELECT s.id, s.name, s.department_id, s.semester, s.strength, s.academic_year,
             s.lunch_after_period, s.time_off, s.color,
             d.name AS department_name, d.code AS department_code,
             COUNT(DISTINCT ta.id) AS assigned_courses_count
      FROM sections s
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN teaching_assignments ta ON ta.section_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      sql += ' AND s.department_id = ?';
      params.push(departmentId);
    }

    sql += ' GROUP BY s.id, s.name, s.department_id, s.semester, s.strength, s.academic_year, s.lunch_after_period, s.time_off, s.color, d.name, d.code';
    sql += ' ORDER BY d.name ASC, s.semester ASC, s.name ASC';

    let sections = await query(sql, params);

    // If no sections exist yet, seed default sections from existing departments so the UI is immediately populated
    if (sections.length === 0 && !departmentId) {
      const depts = await query<{ id: string; code: string }>('SELECT id, code FROM departments LIMIT 5');
      for (const dept of depts) {
        const existing = await query<{ id: string }>('SELECT id FROM sections WHERE department_id = ? AND name = ?', [dept.id, 'Section A']);
        if (existing.length === 0) {
          const sAId = crypto.randomUUID();
          const sBId = crypto.randomUUID();
          await execute(
            `INSERT INTO sections (id, name, department_id, semester, strength, academic_year)
             VALUES (?, 'Section A', ?, 3, 60, '2026-27'),
                    (?, 'Section B', ?, 3, 55, '2026-27')`,
            [sAId, dept.id, sBId, dept.id]
          );
        }
      }
      sections = await query(sql, params);
    }

    return NextResponse.json({ sections });
  } catch (err: any) {
    console.error('Fetch sections error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const { name, department_id, semester = 3, strength = 60, academic_year = '2026-27', lunch_after_period = 4 } = body;

    if (!name || !department_id) {
      return NextResponse.json(
        { error: 'Section name and department are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO sections (id, name, department_id, semester, strength, academic_year, lunch_after_period)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), department_id, Number(semester), Number(strength), academic_year.trim(), Number(lunch_after_period) || 4]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create section error:', err);
    if (err.message?.includes('UNIQUE') || err.message?.includes('uq_dept_section_sem')) {
      return NextResponse.json(
        { error: 'A section with this name and semester already exists in this department.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
