import { NextRequest, NextResponse } from 'next/server';
import { transaction, query } from '@/lib/db';
import crypto from 'node:crypto';

interface StudentImportRow {
  rollNumber: string;
  name: string;
  departmentCode: string;
  semester?: number | string;
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = (await req.json()) as { rows: StudentImportRow[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for import' }, { status: 400 });
    }

    // Resolve departments map
    const departments = await query<{ id: string; code: string }>('SELECT id, code FROM departments');
    const deptMap = new Map<string, string>();
    for (const d of departments) {
      deptMap.set(d.code.toUpperCase(), d.id);
    }

    // Check existing roll numbers in DB
    const existingStudents = await query<{ roll_number: string }>('SELECT roll_number FROM students');
    const existingRolls = new Set(existingStudents.map((s) => s.roll_number.toUpperCase()));

    // Perform atomic transaction
    const insertedCount = await transaction(async (tx) => {
      let count = 0;
      for (const row of rows) {
        const cleanRoll = (row.rollNumber || '').trim().toUpperCase();
        const cleanName = (row.name || '').trim();
        const deptCode = (row.departmentCode || '').trim().toUpperCase();
        const deptId = deptMap.get(deptCode);

        if (!cleanRoll || !cleanName) {
          throw new Error('Roll Number and Name cannot be empty in CSV row.');
        }

        if (!deptId) {
          throw new Error(`Department code "${deptCode}" not found in database.`);
        }

        if (existingRolls.has(cleanRoll)) {
          // If roll number already exists, skip or update
          continue;
        }

        const id = 'stu_' + crypto.randomUUID().substring(0, 12);
        await tx.execute(
          `INSERT INTO students (id, roll_number, name, department_id, semester)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            cleanRoll,
            cleanName,
            deptId,
            Number(row.semester) || 1,
          ]
        );
        existingRolls.add(cleanRoll);
        count++;
      }
      return count;
    });

    return NextResponse.json({ success: true, count: insertedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bulk student import failed';
    console.error('Bulk student import error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
