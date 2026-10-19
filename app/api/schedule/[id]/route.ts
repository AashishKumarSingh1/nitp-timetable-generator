import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      course_id,
      faculty_id,
      room_id,
      section_name,
      day,
      period_index,
      span = 1,
      is_pinned = 1,
    } = body;

    const pStart = Number(period_index);
    const pSpan = Number(span) || 1;
    const pEnd = pStart + pSpan - 1;

    if (!course_id || !faculty_id || !room_id || !section_name || !day || !period_index) {
      return NextResponse.json(
        { error: 'All fields (course, faculty, room, section, day, period) are required.' },
        { status: 400 }
      );
    }

    const lunchAfter = typeof body.lunch_after_period === 'number' ? body.lunch_after_period : 5;
    if (pStart < 1 || pEnd > 12) {
      return NextResponse.json(
        { error: 'Invalid period range. Must be between 1 and 12.' },
        { status: 400 }
      );
    }

    // Check lunch recess cross
    if (lunchAfter > 0 && pStart <= lunchAfter && pEnd > lunchAfter) {
      return NextResponse.json(
        { error: `Sessions cannot cross lunch recess (scheduled after period ${lunchAfter}).` },
        { status: 400 }
      );
    }

    // 1. Conflict Check: Room Availability (excluding self)
    const roomConflicts = await query<{
      period_index: number;
      span: number;
      room_code: string;
      course_code: string;
    }>(
      `SELECT cs.period_index, cs.span, r.code AS room_code, c.code AS course_code
       FROM class_sessions cs
       JOIN rooms r ON r.id = cs.room_id
       JOIN courses c ON c.id = cs.course_id
       WHERE cs.room_id = ? AND cs.day = ? AND cs.id != ?`,
      [room_id, day, id]
    );

    for (const conf of roomConflicts) {
      const confStart = conf.period_index;
      const confEnd = conf.period_index + conf.span - 1;
      if (Math.max(pStart, confStart) <= Math.min(pEnd, confEnd)) {
        return NextResponse.json(
          {
            error: `Room conflict: Room ${conf.room_code} is already booked for ${conf.course_code} on ${day} Period ${confStart}.`,
            conflictType: 'ROOM',
          },
          { status: 409 }
        );
      }
    }

    // 2. Conflict Check: Faculty Availability (excluding self)
    const facultyConflicts = await query<{
      period_index: number;
      span: number;
      faculty_name: string;
      course_code: string;
    }>(
      `SELECT cs.period_index, cs.span, f.name AS faculty_name, c.code AS course_code
       FROM class_sessions cs
       JOIN faculty f ON f.id = cs.faculty_id
       JOIN courses c ON c.id = cs.course_id
       WHERE cs.faculty_id = ? AND cs.day = ? AND cs.id != ?`,
      [faculty_id, day, id]
    );

    for (const conf of facultyConflicts) {
      const confStart = conf.period_index;
      const confEnd = conf.period_index + conf.span - 1;
      if (Math.max(pStart, confStart) <= Math.min(pEnd, confEnd)) {
        return NextResponse.json(
          {
            error: `Faculty conflict: ${conf.faculty_name} is already teaching ${conf.course_code} on ${day} Period ${confStart}.`,
            conflictType: 'FACULTY',
          },
          { status: 409 }
        );
      }
    }

    // 3. Conflict Check: Section Availability (excluding self)
    const sectionConflicts = await query<{
      period_index: number;
      span: number;
      section_name: string;
      course_code: string;
    }>(
      `SELECT cs.period_index, cs.span, cs.section_name, c.code AS course_code
       FROM class_sessions cs
       JOIN courses c ON c.id = cs.course_id
       WHERE cs.section_name = ? AND cs.day = ? AND cs.id != ?`,
      [section_name, day, id]
    );

    for (const conf of sectionConflicts) {
      const confStart = conf.period_index;
      const confEnd = conf.period_index + conf.span - 1;
      if (Math.max(pStart, confStart) <= Math.min(pEnd, confEnd)) {
        return NextResponse.json(
          {
            error: `Section conflict: Cohort ${conf.section_name} already has ${conf.course_code} scheduled on ${day} Period ${confStart}.`,
            conflictType: 'SECTION',
          },
          { status: 409 }
        );
      }
    }

    await execute(
      `UPDATE class_sessions
       SET day = ?, period_index = ?, span = ?, course_id = ?, faculty_id = ?,
           room_id = ?, section_name = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [day, pStart, pSpan, course_id, faculty_id, room_id, section_name, is_pinned ? 1 : 0, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const isPinned = Boolean(body.isPinned);

    await execute('UPDATE class_sessions SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      isPinned ? 1 : 0,
      id,
    ]);

    return NextResponse.json({ success: true, isPinned });
  } catch (err: any) {
    console.error('Pin session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM class_sessions WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
