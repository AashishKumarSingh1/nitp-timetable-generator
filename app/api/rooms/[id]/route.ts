import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, building, floor, type, rows, cols, capacity, is_available, department_id } = body;

    const cleanCode = code.trim().toUpperCase();
    const existing = await queryOne('SELECT id FROM rooms WHERE code = ? AND id != ?', [cleanCode, id]);
    if (existing) {
      return NextResponse.json({ error: `Room code ${cleanCode} is already taken` }, { status: 400 });
    }

    const parsedRows = Number(rows) || 6;
    const parsedCols = Number(cols) || 5;
    const computedCapacity = Number(capacity) || parsedRows * parsedCols;

    await execute(
      `UPDATE rooms 
       SET code = ?, name = ?, building = ?, floor = ?, type = ?,
           rows = ?, cols = ?, capacity = ?, is_available = ?, department_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanCode,
        name.trim(),
        building || 'Main Block',
        Number(floor) || 1,
        type || 'LECTURE_HALL',
        parsedRows,
        parsedCols,
        computedCapacity,
        is_available ? 1 : 0,
        department_id || null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM rooms WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
