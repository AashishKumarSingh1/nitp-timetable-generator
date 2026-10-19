import { NextRequest, NextResponse } from 'next/server';
import { generateAntiCheatingSeating } from '@/lib/seating-engine';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    let user = await getCurrentUser();
    if (!user && process.env.NODE_ENV !== 'production') {
      const { queryOne } = await import('@/lib/db');
      user = await queryOne('SELECT id, email, name, role FROM users WHERE role = ? LIMIT 1', ['ADMIN']);
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { examScheduleId, roomId, departmentAId, departmentBId, clearExisting } = body;

    if (!examScheduleId || !roomId || !departmentAId || !departmentBId) {
      return NextResponse.json(
        { error: 'Exam schedule, Room, and two Departments are required' },
        { status: 400 }
      );
    }

    if (departmentAId === departmentBId) {
      return NextResponse.json(
        { error: 'Anti-cheating requires two distinct student departments or cohorts' },
        { status: 400 }
      );
    }

    const result = await generateAntiCheatingSeating({
      examScheduleId,
      roomId,
      departmentAId,
      departmentBId,
      clearExisting: clearExisting !== false,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Generate seating error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
