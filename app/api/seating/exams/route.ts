import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET() {
  try {
    const exams = await query(`
      SELECT e.id, e.title, e.date, e.slot,
             COUNT(sa.id) as allocated_students,
             COUNT(DISTINCT sa.room_id) as rooms_used
      FROM exam_schedules e
      LEFT JOIN seat_allocations sa ON sa.exam_schedule_id = e.id
      GROUP BY e.id, e.title, e.date, e.slot
      ORDER BY e.created_at DESC
    `);

    // If no exam schedule exists yet, auto-create a default Mid-Term schedule for convenience
    if (exams.length === 0) {
      const defaultId = 'exam_midterm_2026';
      await execute(
        'INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)',
        [defaultId, 'Mid-Term Examinations Autumn 2026', '2026-10-25', 'Morning (09:30-12:30)']
      );
      const created = await query('SELECT id, title, date, slot, 0 as allocated_students, 0 as rooms_used FROM exam_schedules WHERE id = ?', [defaultId]);
      return NextResponse.json({ exams: created });
    }

    return NextResponse.json({ exams });
  } catch (err: any) {
    console.error('Fetch exams error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, date, slot } = await req.json();
    if (!title || !date || !slot) {
      return NextResponse.json({ error: 'Title, Date, and Slot are required' }, { status: 400 });
    }

    const id = 'exam_' + Math.random().toString(36).substring(2, 9);
    await execute(
      'INSERT INTO exam_schedules (id, title, date, slot) VALUES (?, ?, ?, ?)',
      [id, title.trim(), date, slot]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create exam error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
