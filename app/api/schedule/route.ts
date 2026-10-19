import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const facultyId = searchParams.get('facultyId');
    const sectionName = searchParams.get('sectionName');

    let sql = `
      SELECT cs.id, cs.day, cs.period_index, cs.span, cs.section_name, cs.is_pinned,
             c.id AS course_id, c.code AS course_code, c.name AS course_name,
             f.id AS faculty_id, f.code AS faculty_code, f.name AS faculty_name,
             r.id AS room_id, r.code AS room_code, r.name AS room_name, r.type AS room_type,
             d.code AS department_code
      FROM class_sessions cs
      JOIN courses c ON c.id = cs.course_id
      JOIN faculty f ON f.id = cs.faculty_id
      JOIN rooms r ON r.id = cs.room_id
      LEFT JOIN departments d ON d.id = c.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (roomId) {
      sql += ' AND cs.room_id = ?';
      params.push(roomId);
    }
    if (facultyId) {
      sql += ' AND cs.faculty_id = ?';
      params.push(facultyId);
    }
    if (sectionName && sectionName !== 'ALL' && sectionName !== 'all') {
      sql += ' AND (cs.section_name = ? OR cs.section_name LIKE ? OR cs.section_name LIKE ?)';
      params.push(sectionName, `%${sectionName}%`, `${sectionName}%`);
    }

    sql += ' ORDER BY cs.day ASC, cs.period_index ASC';

    const sessions = await query(sql, params);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error('Fetch schedule error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // Check lunch recess cross if configured
    if (lunchAfter > 0 && pStart <= lunchAfter && pEnd > lunchAfter) {
      return NextResponse.json(
        { error: `Sessions cannot cross lunch recess (scheduled after period ${lunchAfter}).` },
        { status: 400 }
      );
    }

    // 1. Conflict Check: Room Availability
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
       WHERE cs.room_id = ? AND cs.day = ?`,
      [room_id, day]
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

    // 2. Conflict Check: Faculty Availability
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
       WHERE cs.faculty_id = ? AND cs.day = ?`,
      [faculty_id, day]
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

    // 3. Conflict Check: Student Section Availability
    const sectionConflicts = await query<{
      period_index: number;
      span: number;
      section_name: string;
      course_code: string;
    }>(
      `SELECT cs.period_index, cs.span, cs.section_name, c.code AS course_code
       FROM class_sessions cs
       JOIN courses c ON c.id = cs.course_id
       WHERE cs.section_name = ? AND cs.day = ?`,
      [section_name, day]
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

    // All collision invariants verified -> Insert Session
    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO class_sessions (id, day, period_index, span, course_id, faculty_id, room_id, section_name, is_pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, day, pStart, pSpan, course_id, faculty_id, room_id, section_name, is_pinned ? 1 : 0]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create schedule session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      await execute('DELETE FROM class_sessions WHERE is_pinned = 0');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Clear schedule error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
