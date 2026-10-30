import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, email, department_id, designation, max_daily_periods, max_weekly_periods, time_off, color } = body;

    const cleanCode = code ? code.trim().toUpperCase() : undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    if (cleanCode) {
      const existingCode = await queryOne('SELECT id FROM faculty WHERE code = ? AND id != ?', [cleanCode, id]);
      if (existingCode) {
        return NextResponse.json({ error: `Faculty code ${cleanCode} is already in use` }, { status: 400 });
      }
    }

    if (cleanEmail) {
      const existingEmail = await queryOne('SELECT id FROM faculty WHERE email = ? AND id != ?', [cleanEmail, id]);
      if (existingEmail) {
        return NextResponse.json({ error: `Email ${cleanEmail} is already in use` }, { status: 400 });
      }
    }

    const timeOffStr = typeof time_off === 'object' && time_off !== null ? JSON.stringify(time_off) : time_off;

    await execute(
      `UPDATE faculty
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           email = COALESCE(?, email),
           department_id = COALESCE(?, department_id),
           designation = COALESCE(?, designation),
           max_daily_periods = COALESCE(?, max_daily_periods),
           max_weekly_periods = COALESCE(?, max_weekly_periods),
           time_off = COALESCE(?, time_off),
           color = COALESCE(?, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanCode || null,
        name ? name.trim() : null,
        cleanEmail || null,
        department_id || null,
        designation || null,
        max_daily_periods !== undefined ? Number(max_daily_periods) : null,
        max_weekly_periods !== undefined ? Number(max_weekly_periods) : null,
        timeOffStr !== undefined ? timeOffStr : null,
        color !== undefined ? color : null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update faculty error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM faculty WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete faculty error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
