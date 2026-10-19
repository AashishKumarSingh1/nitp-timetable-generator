import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const departments = await query(`
      SELECT d.id, d.name, d.code,
             COUNT(DISTINCT f.id) AS faculty_count,
             COUNT(DISTINCT r.id) AS room_count,
             COUNT(DISTINCT c.id) AS course_count
      FROM departments d
      LEFT JOIN faculty f ON f.department_id = d.id
      LEFT JOIN rooms r ON r.department_id = d.id
      LEFT JOIN courses c ON c.department_id = d.id
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name ASC
    `);
    return NextResponse.json({ departments });
  } catch (err: any) {
    console.error('Failed to fetch departments:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, code } = await req.json();
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    const existing = await queryOne('SELECT id FROM departments WHERE code = ? OR name = ?', [cleanCode, cleanName]);
    if (existing) {
      return NextResponse.json({ error: 'A department with this code or name already exists' }, { status: 400 });
    }

    const id = 'dept_' + cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
    await execute('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)', [id, cleanName, cleanCode]);

    return NextResponse.json({ success: true, department: { id, name: cleanName, code: cleanCode } }, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create department:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
