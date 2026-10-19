import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const section = await query(
      `SELECT s.id, s.name, s.department_id, s.semester, s.strength, s.academic_year,
              d.name AS department_name, d.code AS department_code
       FROM sections s
       JOIN departments d ON d.id = s.department_id
       WHERE s.id = ?`,
      [id]
    );

    if (section.length === 0) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const assignments = await query(
      `SELECT ta.id, ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week,
              c.code AS course_code, c.name AS course_name, c.span,
              f.code AS faculty_code, f.name AS faculty_name, f.designation
       FROM teaching_assignments ta
       JOIN courses c ON c.id = ta.course_id
       JOIN faculty f ON f.id = ta.faculty_id
       WHERE ta.section_id = ?
       ORDER BY c.code ASC`,
      [id]
    );

    return NextResponse.json({ section: section[0], assignments });
  } catch (err: any) {
    console.error('Fetch section detail error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, department_id, semester = 3, strength = 60, academic_year = '2026-27' } = body;

    if (!name || !department_id) {
      return NextResponse.json(
        { error: 'Section name and department are required' },
        { status: 400 }
      );
    }

    await execute(
      `UPDATE sections
       SET name = ?, department_id = ?, semester = ?, strength = ?, academic_year = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name.trim(), department_id, Number(semester), Number(strength), academic_year.trim(), id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update section error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM sections WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete section error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
