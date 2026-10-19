import { NextRequest, NextResponse } from 'next/server';
import { transaction, query } from '@/lib/db';

interface ImportRow {
  code: string;
  name: string;
  email: string;
  departmentCode: string;
  designation?: string;
  maxDaily?: number;
  maxWeekly?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = (await req.json()) as { rows: ImportRow[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 });
    }

    // Get departments map for ID resolution
    const departments = await query<{ id: string; code: string }>('SELECT id, code FROM departments');
    const deptMap = new Map<string, string>();
    for (const d of departments) {
      deptMap.set(d.code.toUpperCase(), d.id);
    }

    // Perform atomic transaction
    const insertedCount = await transaction(async (tx) => {
      let count = 0;
      for (const row of rows) {
        const cleanCode = row.code.trim().toUpperCase();
        const cleanEmail = row.email.trim().toLowerCase();
        const deptId = deptMap.get(row.departmentCode.trim().toUpperCase());

        if (!deptId) {
          throw new Error(`Department code ${row.departmentCode} not found in database.`);
        }

        const id = 'fac_' + Math.random().toString(36).substring(2, 9);
        await tx.execute(
          `INSERT INTO faculty (id, code, name, email, designation, department_id, max_daily_periods, max_weekly_periods)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            cleanCode,
            row.name.trim(),
            cleanEmail,
            row.designation?.trim() || 'Assistant Professor',
            deptId,
            Number(row.maxDaily) || 4,
            Number(row.maxWeekly) || 18,
          ]
        );
        count++;
      }
      return count;
    });

    return NextResponse.json({ success: true, count: insertedCount });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
