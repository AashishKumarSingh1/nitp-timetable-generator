import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerSolver } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const daysCount = body.daysCount === 6 ? 6 : 5;
    const clearUnpinned = body.clearUnpinned !== false;
    const periodsCount = typeof body.periodsCount === 'number' ? body.periodsCount : 9;
    const lunchAfterPeriod = typeof body.lunchAfterPeriod === 'number' ? body.lunchAfterPeriod : 5;

    const result = await runSchedulerSolver({
      daysCount,
      clearUnpinned,
      periodsCount,
      lunchAfterPeriod,
    });
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Schedule solver error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
