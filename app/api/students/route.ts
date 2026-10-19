import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const semester = searchParams.get('semester');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let sql = `
      SELECT s.id, s.roll_number, s.name, s.department_id, s.semester, s.created_at,
             d.name AS department_name, d.code AS department_code
      FROM students s
      JOIN departments d ON d.id = s.department_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (departmentId) {
      sql += ' AND s.department_id = ?';
      params.push(departmentId);
    }
    if (semester) {
      sql += ' AND s.semester = ?';
      params.push(Number(semester));
    }
    if (search) {
      sql += ' AND (LOWER(s.roll_number) LIKE ? OR LOWER(s.name) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY d.code ASC, s.semester ASC, s.roll_number ASC';

    const students = await query(sql, params);
    return NextResponse.json({ students });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch students';
    console.error('Fetch students error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roll_number, name, department_id, semester = 1 } = body;

    if (!roll_number || !name || !department_id) {
      return NextResponse.json(
        { error: 'Roll number, student name, and department are required' },
        { status: 400 }
      );
    }

    const cleanRoll = roll_number.trim().toUpperCase();

    // Check unique roll number
    const existing = await query<{ id: string }>(
      'SELECT id FROM students WHERE roll_number = ?',
      [cleanRoll]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Student with roll number ${cleanRoll} already exists` },
        { status: 409 }
      );
    }

    const id = 'stu_' + crypto.randomUUID().substring(0, 12);
    await execute(
      `INSERT INTO students (id, roll_number, name, department_id, semester)
       VALUES (?, ?, ?, ?, ?)`,
      [id, cleanRoll, name.trim(), department_id, Number(semester) || 1]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create student';
    console.error('Create student error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
