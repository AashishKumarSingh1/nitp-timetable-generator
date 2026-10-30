import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, building, floor, type, rows, cols, capacity, is_available, department_id, time_off, color } = body;

    const cleanCode = code ? code.trim().toUpperCase() : undefined;
    if (cleanCode) {
      const existing = await queryOne('SELECT id FROM rooms WHERE code = ? AND id != ?', [cleanCode, id]);
      if (existing) {
        return NextResponse.json({ error: `Room code ${cleanCode} is already taken` }, { status: 400 });
      }
    }

    const parsedRows = rows !== undefined ? Number(rows) : undefined;
    const parsedCols = cols !== undefined ? Number(cols) : undefined;
    const computedCapacity = capacity !== undefined ? Number(capacity) : (parsedRows && parsedCols ? parsedRows * parsedCols : undefined);
    const timeOffStr = typeof time_off === 'object' && time_off !== null ? JSON.stringify(time_off) : time_off;

    await execute(
      `UPDATE rooms 
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           building = COALESCE(?, building),
           floor = COALESCE(?, floor),
           type = COALESCE(?, type),
           rows = COALESCE(?, rows),
           cols = COALESCE(?, cols),
           capacity = COALESCE(?, capacity),
           is_available = COALESCE(?, is_available),
           department_id = COALESCE(?, department_id),
           time_off = COALESCE(?, time_off),
           color = COALESCE(?, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanCode || null,
        name ? name.trim() : null,
        building || null,
        floor !== undefined ? Number(floor) : null,
        type || null,
        parsedRows !== undefined ? parsedRows : null,
        parsedCols !== undefined ? parsedCols : null,
        computedCapacity !== undefined ? computedCapacity : null,
        is_available !== undefined ? (is_available ? 1 : 0) : null,
        department_id !== undefined ? department_id : null,
        timeOffStr !== undefined ? timeOffStr : null,
        color !== undefined ? color : null,
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
