import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const sectionId = searchParams.get('sectionId');
    const facultyId = searchParams.get('facultyId');

    let sql = `
      SELECT ta.id, ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week, ta.created_at,
             s.name AS section_name, s.semester, s.strength AS section_strength,
             d.id AS department_id, d.name AS department_name, d.code AS department_code,
             c.code AS course_code, c.name AS course_name, c.span AS course_span,
             f.code AS faculty_code, f.name AS faculty_name, f.designation AS faculty_designation
      FROM teaching_assignments ta
      JOIN sections s ON s.id = ta.section_id
      JOIN departments d ON d.id = s.department_id
      JOIN courses c ON c.id = ta.course_id
      JOIN faculty f ON f.id = ta.faculty_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      sql += ' AND s.department_id = ?';
      params.push(departmentId);
    }
    if (sectionId) {
      sql += ' AND ta.section_id = ?';
      params.push(sectionId);
    }
    if (facultyId) {
      sql += ' AND ta.faculty_id = ?';
      params.push(facultyId);
    }

    sql += ' ORDER BY d.name ASC, s.name ASC, c.code ASC';

    const allocations = await query(sql, params);
    return NextResponse.json({ allocations });
  } catch (err: any) {
    console.error('Fetch allocations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section_id, course_id, faculty_id, periods_per_week = 3 } = body;

    if (!section_id || !course_id || !faculty_id) {
      return NextResponse.json(
        { error: 'Section, Course, and Faculty instructor are required for mapping.' },
        { status: 400 }
      );
    }

    // Check if an allocation already exists for this (section, course)
    const existing = await query<{ id: string }>(
      'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
      [section_id, course_id]
    );

    if (existing.length > 0) {
      // Update assigned faculty
      await execute(
        `UPDATE teaching_assignments
         SET faculty_id = ?, periods_per_week = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [faculty_id, Number(periods_per_week) || 3, existing[0].id]
      );
      return NextResponse.json({ success: true, id: existing[0].id, updated: true });
    }

    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week)
       VALUES (?, ?, ?, ?, ?)`,
      [id, section_id, course_id, faculty_id, Number(periods_per_week) || 3]
    );

    return NextResponse.json({ success: true, id, created: true }, { status: 201 });
  } catch (err: any) {
    console.error('Create teaching allocation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Allocation ID is required' }, { status: 400 });
    }

    await execute('DELETE FROM teaching_assignments WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete teaching allocation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
