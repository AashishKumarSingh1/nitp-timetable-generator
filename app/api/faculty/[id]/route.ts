import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, email, department_id, designation, max_daily_periods, max_weekly_periods } = body;

    const cleanCode = code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingCode = await queryOne('SELECT id FROM faculty WHERE code = ? AND id != ?', [cleanCode, id]);
    if (existingCode) {
      return NextResponse.json({ error: `Faculty code ${cleanCode} is already in use` }, { status: 400 });
    }

    const existingEmail = await queryOne('SELECT id FROM faculty WHERE email = ? AND id != ?', [cleanEmail, id]);
    if (existingEmail) {
      return NextResponse.json({ error: `Email ${cleanEmail} is already in use` }, { status: 400 });
    }

    await execute(
      `UPDATE faculty
       SET code = ?, name = ?, email = ?, department_id = ?, designation = ?,
           max_daily_periods = ?, max_weekly_periods = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanCode,
        name.trim(),
        cleanEmail,
        department_id,
        designation || 'Assistant Professor',
        Number(max_daily_periods) || 4,
        Number(max_weekly_periods) || 18,
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
