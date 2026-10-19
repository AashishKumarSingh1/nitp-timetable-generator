import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examScheduleId = searchParams.get('examScheduleId');
    const roomId = searchParams.get('roomId');

    if (!examScheduleId || !roomId) {
      return NextResponse.json({ error: 'examScheduleId and roomId are required' }, { status: 400 });
    }

    const allocations = await query(`
      SELECT sa.id, sa.exam_schedule_id, sa.room_id, sa.student_id,
             sa.row_num, sa.col_num, sa.seat_label,
             s.roll_number as student_roll, s.name as student_name,
             d.code as department_code, d.name as department_name
      FROM seat_allocations sa
      JOIN students s ON s.id = sa.student_id
      JOIN departments d ON d.id = s.department_id
      WHERE sa.exam_schedule_id = ? AND sa.room_id = ?
      ORDER BY sa.row_num ASC, sa.col_num ASC
    `, [examScheduleId, roomId]);

    return NextResponse.json({ allocations });
  } catch (err: any) {
    console.error('Fetch seating error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examScheduleId = searchParams.get('examScheduleId');
    const roomId = searchParams.get('roomId');

    if (examScheduleId && roomId) {
      await execute('DELETE FROM seat_allocations WHERE exam_schedule_id = ? AND room_id = ?', [examScheduleId, roomId]);
    } else if (examScheduleId) {
      await execute('DELETE FROM seat_allocations WHERE exam_schedule_id = ?', [examScheduleId]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Clear seating error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
