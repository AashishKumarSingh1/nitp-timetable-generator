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
              s.lunch_after_period, s.time_off, s.color,
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
    const { name, department_id, semester, strength, academic_year, lunch_after_period, time_off, color } = body;

    const timeOffStr = typeof time_off === 'object' && time_off !== null ? JSON.stringify(time_off) : time_off;

    await execute(
      `UPDATE sections
       SET name = COALESCE(?, name),
           department_id = COALESCE(?, department_id),
           semester = COALESCE(?, semester),
           strength = COALESCE(?, strength),
           academic_year = COALESCE(?, academic_year),
           lunch_after_period = COALESCE(?, lunch_after_period),
           time_off = COALESCE(?, time_off),
           color = COALESCE(?, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        department_id || null,
        semester !== undefined ? Number(semester) : null,
        strength !== undefined ? Number(strength) : null,
        academic_year ? academic_year.trim() : null,
        lunch_after_period !== undefined ? Number(lunch_after_period) : null,
        timeOffStr !== undefined ? timeOffStr : null,
        color !== undefined ? color : null,
        id,
      ]
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
