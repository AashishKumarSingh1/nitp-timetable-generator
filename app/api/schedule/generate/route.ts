import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerSolver, testTimetableFeasibility } from '@/lib/scheduler';
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

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const action = searchParams.get('action') || body.action;

    const daysCount = body.daysCount === 6 ? 6 : 5;
    const periodsCount = typeof body.periodsCount === 'number' ? body.periodsCount : 8;

    // Pre-flight Test Action
    if (action === 'test') {
      const testResult = await testTimetableFeasibility({
        daysCount,
        periodsCount,
      });
      return NextResponse.json({ success: true, testResult });
    }

    const clearUnpinned = body.clearUnpinned !== false;
    const lunchAfterPeriod = typeof body.lunchAfterPeriod === 'number' ? body.lunchAfterPeriod : 4;
    const complexity = body.complexity || 'normal';
    const strictness = body.strictness || 'strict';

    const result = await runSchedulerSolver({
      daysCount,
      clearUnpinned,
      periodsCount,
      lunchAfterPeriod,
      complexity,
      strictness,
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Schedule solver error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
