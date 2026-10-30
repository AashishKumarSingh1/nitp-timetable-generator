import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const sectionId = searchParams.get('sectionId');
    const facultyId = searchParams.get('facultyId');

    let sql = `
      SELECT ta.id, ta.section_id, ta.course_id, ta.faculty_id, ta.periods_per_week, ta.batch, ta.created_at,
             ta.lesson_format, c.lesson_format AS course_lesson_format,
             s.name AS section_name, s.semester, s.strength AS section_strength,
             d.id AS department_id, d.name AS department_name, d.code AS department_code,
             c.code AS course_code, c.name AS course_name, c.span AS course_span,
             f.code AS faculty_code, f.name AS faculty_name, f.designation AS faculty_designation
      FROM teaching_assignments ta
      JOIN sections s ON s.id = ta.section_id
      JOIN departments d ON d.id = s.department_id
      JOIN courses c ON c.id = ta.course_id
      JOIN faculty f ON f.id = ta.faculty_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId) {
      sql += ' AND s.department_id = ?';
      params.push(departmentId);
    }
    if (sectionId) {
      sql += ' AND ta.section_id = ?';
      params.push(sectionId);
    }
    if (facultyId) {
      sql += ' AND ta.faculty_id = ?';
      params.push(facultyId);
    }

    sql += ' ORDER BY d.name ASC, s.name ASC, c.code ASC';

    const allocations = await query(sql, params);

    // Compute live faculty workloads for all faculty in department or system
    const workloadSql = `
      SELECT f.id AS faculty_id, f.name AS faculty_name, f.code AS faculty_code,
             f.department_id, f.max_weekly_periods,
             COALESCE(SUM(ta.periods_per_week), 0) AS assigned_hours
      FROM faculty f
      LEFT JOIN teaching_assignments ta ON ta.faculty_id = f.id
      ${departmentId ? 'WHERE f.department_id = ?' : ''}
      GROUP BY f.id, f.name, f.code, f.department_id, f.max_weekly_periods
    `;
    const facultyWorkloads = await query<any>(workloadSql, departmentId ? [departmentId] : []);

    return NextResponse.json({
      allocations,
      facultyWorkloads: facultyWorkloads.map((fw: any) => ({
        faculty_id: fw.faculty_id,
        faculty_name: fw.faculty_name,
        faculty_code: fw.faculty_code,
        department_id: fw.department_id,
        assigned_hours: Number(fw.assigned_hours) || 0,
        max_weekly_periods: Number(fw.max_weekly_periods) || 18,
        remaining_hours: Math.max(0, (Number(fw.max_weekly_periods) || 18) - (Number(fw.assigned_hours) || 0)),
      })),
    });
  } catch (err: any) {
    console.error('Fetch allocations error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const {
      scope = 'single', // 'single' | 'all_sections'
      department_id,
      section_id,
      course_id,
      faculty_id,
      periods_per_week = 3,
      lesson_format = 'DEFAULT',
      max_batches_per_teacher, // optional limit: number of batches this teacher can teach this subject
      auto_balance = true,
    } = body;

    if (!course_id || !faculty_id) {
      return NextResponse.json(
        { error: 'Course and Faculty instructor are required.' },
        { status: 400 }
      );
    }

    const periods = Number(periods_per_week) || 3;
    const lessonFormat = lesson_format ? String(lesson_format).trim() : 'DEFAULT';
    const maxBatches = max_batches_per_teacher ? Number(max_batches_per_teacher) : Infinity;

    // Fetch primary faculty info
    const primaryFaculty = await queryOne<{ id: string; name: string; department_id: string; max_weekly_periods: number }>(
      'SELECT id, name, department_id, max_weekly_periods FROM faculty WHERE id = ?',
      [faculty_id]
    );
    if (!primaryFaculty) {
      return NextResponse.json({ error: 'Selected faculty not found' }, { status: 404 });
    }

    // SCENARIO 1A: Bulk Assign Professor X to Subject Code Y across All Sections
    if (scope === 'all_sections' || section_id === 'ALL') {
      const deptId = department_id || primaryFaculty.department_id;

      // Find all sections in this department
      const targetSections = await query<{ id: string; name: string; semester: number }>(
        'SELECT id, name, semester FROM sections WHERE department_id = ? ORDER BY name ASC',
        [deptId]
      );

      if (targetSections.length === 0) {
        return NextResponse.json(
          { error: 'No sections found in this department to assign.' },
          { status: 400 }
        );
      }

      // Calculate primary faculty existing load (excluding current assignments for this course)
      const existingOtherLoad = await queryOne<{ load: number }>(
        'SELECT COALESCE(SUM(periods_per_week), 0) as load FROM teaching_assignments WHERE faculty_id = ? AND course_id != ?',
        [faculty_id, course_id]
      );
      let currentFacLoad = Number(existingOtherLoad?.load) || 0;
      const maxWeekly = primaryFaculty.max_weekly_periods || 18;

      // Qualified secondary faculty pool in department if auto-balance is active
      const candidateFallbackPool = await query<{ id: string; name: string; max_weekly_periods: number }>(
        'SELECT id, name, max_weekly_periods FROM faculty WHERE department_id = ? AND id != ?',
        [deptId, faculty_id]
      );

      const assignedResults: { section_id: string; section_name: string; faculty_id: string; faculty_name: string; fallback: boolean }[] = [];
      let primaryBatchesCount = 0;

      for (const sec of targetSections) {
        const canTakeBatch = primaryBatchesCount < maxBatches && (currentFacLoad + periods <= maxWeekly);

        // Can primary faculty take this section?
        if (canTakeBatch) {
          // Assign to Primary Faculty
          const existing = await queryOne<{ id: string }>(
            'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
            [sec.id, course_id]
          );

          if (existing) {
            await execute(
              'UPDATE teaching_assignments SET faculty_id = ?, periods_per_week = ?, lesson_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [faculty_id, periods, lessonFormat, existing.id]
            );
          } else {
            const id = crypto.randomUUID();
            await execute(
              'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, lesson_format) VALUES (?, ?, ?, ?, ?, ?)',
              [id, sec.id, course_id, faculty_id, periods, lessonFormat]
            );
          }

          currentFacLoad += periods;
          primaryBatchesCount++;
          assignedResults.push({
            section_id: sec.id,
            section_name: sec.name,
            faculty_id,
            faculty_name: primaryFaculty.name,
            fallback: false,
          });
        } else if (auto_balance && candidateFallbackPool.length > 0) {
          // Find next available faculty with capacity
          let assignedFallback = false;
          for (const fb of candidateFallbackPool) {
            const fbLoadRes = await queryOne<{ load: number }>(
              'SELECT COALESCE(SUM(periods_per_week), 0) as load FROM teaching_assignments WHERE faculty_id = ?',
              [fb.id]
            );
            const fbLoad = Number(fbLoadRes?.load) || 0;
            if (fbLoad + periods <= fb.max_weekly_periods) {
              const existing = await queryOne<{ id: string }>(
                'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
                [sec.id, course_id]
              );
              if (existing) {
                await execute(
                  'UPDATE teaching_assignments SET faculty_id = ?, periods_per_week = ?, lesson_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [fb.id, periods, lessonFormat, existing.id]
                );
              } else {
                const id = crypto.randomUUID();
                await execute(
                  'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, lesson_format) VALUES (?, ?, ?, ?, ?, ?)',
                  [id, sec.id, course_id, fb.id, periods, lessonFormat]
                );
              }

              assignedResults.push({
                section_id: sec.id,
                section_name: sec.name,
                faculty_id: fb.id,
                faculty_name: fb.name,
                fallback: true,
              });
              assignedFallback = true;
              break;
            }
          }

          // If no fallback had capacity, still force assign to primary faculty with quota warning
          if (!assignedFallback) {
            const existing = await queryOne<{ id: string }>(
              'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
              [sec.id, course_id]
            );
            if (existing) {
              await execute(
                'UPDATE teaching_assignments SET faculty_id = ?, periods_per_week = ?, lesson_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [faculty_id, periods, lessonFormat, existing.id]
              );
            } else {
              const id = crypto.randomUUID();
              await execute(
                'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, lesson_format) VALUES (?, ?, ?, ?, ?, ?)',
                [id, sec.id, course_id, faculty_id, periods, lessonFormat]
              );
            }
            currentFacLoad += periods;
            assignedResults.push({
              section_id: sec.id,
              section_name: sec.name,
              faculty_id,
              faculty_name: primaryFaculty.name,
              fallback: false,
            });
          }
        } else {
          // Assign to primary anyway (quota exceeded)
          const existing = await queryOne<{ id: string }>(
            'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ?',
            [sec.id, course_id]
          );
          if (existing) {
            await execute(
              'UPDATE teaching_assignments SET faculty_id = ?, periods_per_week = ?, lesson_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [faculty_id, periods, lessonFormat, existing.id]
            );
          } else {
            const id = crypto.randomUUID();
            await execute(
              'INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, lesson_format) VALUES (?, ?, ?, ?, ?, ?)',
              [id, sec.id, course_id, faculty_id, periods, lessonFormat]
            );
          }
          currentFacLoad += periods;
          assignedResults.push({
            section_id: sec.id,
            section_name: sec.name,
            faculty_id,
            faculty_name: primaryFaculty.name,
            fallback: false,
          });
        }
      }

      return NextResponse.json({
        success: true,
        scope: 'all_sections',
        total_assigned: assignedResults.length,
        results: assignedResults,
        faculty_workload: {
          faculty_id,
          name: primaryFaculty.name,
          current_load: currentFacLoad,
          max_weekly: maxWeekly,
          exceeded: currentFacLoad > maxWeekly,
        },
      });
    }

    // SCENARIO 1B: Single Section Assignment
    if (!section_id) {
      return NextResponse.json({ error: 'Section is required for single mapping.' }, { status: 400 });
    }

    const batch = body.batch ? String(body.batch).trim() : 'ALL';

    // Check if an allocation already exists for this (section, course, batch)
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM teaching_assignments WHERE section_id = ? AND course_id = ? AND batch = ?',
      [section_id, course_id, batch]
    );

    if (existing) {
      await execute(
        `UPDATE teaching_assignments
         SET faculty_id = ?, periods_per_week = ?, lesson_format = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [faculty_id, periods, lessonFormat, existing.id]
      );
      return NextResponse.json({ success: true, id: existing.id, updated: true });
    }

    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO teaching_assignments (id, section_id, course_id, faculty_id, periods_per_week, batch, lesson_format)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, section_id, course_id, faculty_id, periods, batch, lessonFormat]
    );

    return NextResponse.json({ success: true, id, created: true }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    console.error('Create teaching allocation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Allocation ID is required' }, { status: 400 });
    }

    await execute('DELETE FROM teaching_assignments WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }
    console.error('Delete teaching allocation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
