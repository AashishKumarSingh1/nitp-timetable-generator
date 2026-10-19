import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, code } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    const existing = await queryOne('SELECT id FROM departments WHERE (code = ? OR name = ?) AND id != ?', [cleanCode, cleanName, id]);
    if (existing) {
      return NextResponse.json({ error: 'Another department already uses this name or code' }, { status: 400 });
    }

    await execute('UPDATE departments SET name = ?, code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cleanName, cleanCode, id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update department error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM departments WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete department error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
