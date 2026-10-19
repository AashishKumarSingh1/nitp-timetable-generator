import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await query(
      `SELECT c.id, c.code, c.name, c.department_id, c.semester, c.periods_per_week, c.span,
              d.name AS department_name, d.code AS department_code
       FROM courses c
       LEFT JOIN departments d ON d.id = c.department_id
       WHERE c.id = ?`,
      [id]
    );

    if (course.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course: course[0] });
  } catch (err: any) {
    console.error('Fetch course detail error:', err);
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
    const { code, name, department_id, semester = 3, periods_per_week = 3, span = 1 } = body;

    if (!code || !name || !department_id) {
      return NextResponse.json(
        { error: 'Course code, name, and department are required' },
        { status: 400 }
      );
    }

    await execute(
      `UPDATE courses
       SET code = ?, name = ?, department_id = ?, semester = ?, periods_per_week = ?, span = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [code.trim().toUpperCase(), name.trim(), department_id, Number(semester), Number(periods_per_week), Number(span), id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update course error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM courses WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete course error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
