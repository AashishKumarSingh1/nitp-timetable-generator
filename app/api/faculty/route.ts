import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const faculty = await query(`
      SELECT f.id, f.code, f.name, f.email, f.designation,
             f.department_id, f.max_daily_periods, f.max_weekly_periods,
             f.time_off, f.color,
             d.name AS department_name, d.code AS department_code,
             COUNT(cs.id) AS assigned_periods
      FROM faculty f
      LEFT JOIN departments d ON d.id = f.department_id
      LEFT JOIN class_sessions cs ON cs.faculty_id = f.id
      GROUP BY f.id, f.code, f.name, f.email, f.designation, f.department_id, f.max_daily_periods, f.max_weekly_periods, f.time_off, f.color, d.name, d.code
      ORDER BY f.code ASC
    `);
    return NextResponse.json({ faculty });
  } catch (err: any) {
    console.error('Fetch faculty error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, email, department_id, designation, max_daily_periods, max_weekly_periods } = body;

    if (!code || !name || !email || !department_id) {
      return NextResponse.json({ error: 'Code, Name, Email, and Department are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingCode = await queryOne('SELECT id FROM faculty WHERE code = ?', [cleanCode]);
    if (existingCode) {
      return NextResponse.json({ error: `Faculty code ${cleanCode} already exists` }, { status: 400 });
    }

    const existingEmail = await queryOne('SELECT id FROM faculty WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return NextResponse.json({ error: `Email ${cleanEmail} is already registered` }, { status: 400 });
    }

    const id = 'fac_' + Math.random().toString(36).substring(2, 9);
    await execute(
      `INSERT INTO faculty (id, code, name, email, designation, department_id, max_daily_periods, max_weekly_periods)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanCode,
        name.trim(),
        cleanEmail,
        designation || 'Assistant Professor',
        department_id,
        Number(max_daily_periods) || 4,
        Number(max_weekly_periods) || 18,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('Create faculty error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
