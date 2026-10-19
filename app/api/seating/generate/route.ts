import { NextRequest, NextResponse } from 'next/server';
import { generateAntiCheatingSeating } from '@/lib/seating-engine';

export async function POST(req: NextRequest) {
  try {
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
