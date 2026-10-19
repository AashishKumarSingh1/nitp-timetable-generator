import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await query(
      `SELECT s.id, s.roll_number, s.name, s.department_id, s.semester, s.created_at,
              d.name AS department_name, d.code AS department_code
       FROM students s
       JOIN departments d ON d.id = s.department_id
       WHERE s.id = ?`,
      [id]
    );

    if (student.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student: student[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch student';
    console.error('Fetch student detail error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { roll_number, name, department_id, semester } = body;

    if (!roll_number || !name || !department_id) {
      return NextResponse.json(
        { error: 'Roll number, student name, and department are required' },
        { status: 400 }
      );
    }

    const cleanRoll = roll_number.trim().toUpperCase();

    // Check unique roll number excluding current student
    const existing = await query<{ id: string }>(
      'SELECT id FROM students WHERE roll_number = ? AND id != ?',
      [cleanRoll, id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Another student with roll number ${cleanRoll} already exists` },
        { status: 409 }
      );
    }

    await execute(
      `UPDATE students
       SET roll_number = ?, name = ?, department_id = ?, semester = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cleanRoll, name.trim(), department_id, Number(semester) || 1, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update student';
    console.error('Update student error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM students WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete student';
    console.error('Delete student error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
