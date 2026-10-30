import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const rooms = await query(`
      SELECT r.id, r.code, r.name, r.building, r.floor, r.type,
             r.rows, r.cols, r.capacity, r.is_available,
             r.time_off, r.color,
             r.department_id, d.name AS department_name, d.code AS department_code
      FROM rooms r
      LEFT JOIN departments d ON d.id = r.department_id
      ORDER BY r.code ASC
    `);
    return NextResponse.json({ rooms });
  } catch (err: any) {
    console.error('Fetch rooms error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, building, floor, type, rows, cols, capacity, is_available, department_id } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Room Code and Name are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await queryOne('SELECT id FROM rooms WHERE code = ?', [cleanCode]);
    if (existing) {
      return NextResponse.json({ error: `Room code ${cleanCode} already exists` }, { status: 400 });
    }

    const parsedRows = Number(rows) || 6;
    const parsedCols = Number(cols) || 5;
    const computedCapacity = Number(capacity) || parsedRows * parsedCols;
    const id = 'rm_' + Math.random().toString(36).substring(2, 9);

    await execute(
      `INSERT INTO rooms (id, code, name, building, floor, type, rows, cols, capacity, is_available, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanCode,
        name.trim(),
        building || 'Main Block',
        Number(floor) || 1,
        type || 'LECTURE_HALL',
        parsedRows,
        parsedCols,
        computedCapacity,
        is_available === false ? 0 : 1,
        department_id || null,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create room error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
