import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const isAvailable = Boolean(body.is_available);

    await execute('UPDATE rooms SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      isAvailable ? 1 : 0,
      id,
    ]);

    return NextResponse.json({ success: true, is_available: isAvailable });
  } catch (err: any) {
    console.error('Toggle room availability error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
