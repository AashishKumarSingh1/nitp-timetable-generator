import { query, transaction } from './db';

export interface SeatingStudent {
  id: string;
  rollNumber: string;
  name: string;
  departmentId: string;
  departmentCode: string;
}

export interface RoomLayout {
  id: string;
  code: string;
  name: string;
  rows: number;
  cols: number;
  capacity: number;
}

export interface AllocatedSeat {
  id: string;
  examScheduleId: string;
  roomId: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  departmentCode: string;
  rowNum: number;
  colNum: number;
  seatLabel: string;
}

export interface SeatingResult {
  success: boolean;
  totalSeatsInRoom: number;
  totalAllocated: number;
  allocatedSeats: AllocatedSeat[];
  overflowStudents: SeatingStudent[];
  zeroAdjacentCollisionsVerified: boolean;
}

export async function generateAntiCheatingSeating(params: {
  examScheduleId: string;
  roomId: string;
  departmentAId: string;
  departmentBId: string;
  clearExisting?: boolean;
}): Promise<SeatingResult> {
  const { examScheduleId, roomId, departmentAId, departmentBId, clearExisting } = params;

  // 1. Fetch Room dimensions
  const roomRows = await query<RoomLayout>(
    'SELECT id, code, name, rows, cols, capacity FROM rooms WHERE id = ?',
    [roomId]
  );
  if (roomRows.length === 0) {
    throw new Error('Selected room was not found.');
  }
  const room = roomRows[0];

  // 2. Fetch Students from Department A and Department B who are NOT already seated in another room for this exam
  const studentsA = await query<SeatingStudent>(
    `SELECT s.id, s.roll_number as rollNumber, s.name, s.department_id as departmentId, d.code as departmentCode
     FROM students s
     JOIN departments d ON d.id = s.department_id
     WHERE s.department_id = ?
       AND s.id NOT IN (SELECT student_id FROM seat_allocations WHERE exam_schedule_id = ? AND room_id != ?)
     ORDER BY s.roll_number ASC`,
    [departmentAId, examScheduleId, roomId]
  );

  const studentsB = await query<SeatingStudent>(
    `SELECT s.id, s.roll_number as rollNumber, s.name, s.department_id as departmentId, d.code as departmentCode
     FROM students s
     JOIN departments d ON d.id = s.department_id
     WHERE s.department_id = ?
       AND s.id NOT IN (SELECT student_id FROM seat_allocations WHERE exam_schedule_id = ? AND room_id != ?)
     ORDER BY s.roll_number ASC`,
    [departmentBId, examScheduleId, roomId]
  );

  if (studentsA.length === 0 && studentsB.length === 0) {
    throw new Error('No students found for the selected departments.');
  }

  // 3. Checkerboard / Zigzag Interleaving Allocation
  // Row parity:
  // If (row + col) % 2 == 0 -> Department A
  // If (row + col) % 2 == 1 -> Department B
  // This guarantees that adjacent cells (row ± 1, col) and (row, col ± 1) have opposite parities!
  const queueA = [...studentsA];
  const queueB = [...studentsB];

  const allocations: AllocatedSeat[] = [];
  const matrix: (AllocatedSeat | null)[][] = Array.from({ length: room.rows }, () =>
    Array.from({ length: room.cols }, () => null)
  );

  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      const isEvenParity = (r + c) % 2 === 0;
      let targetStudent: SeatingStudent | undefined;

      if (isEvenParity) {
        targetStudent = queueA.shift() || queueB.shift();
      } else {
        targetStudent = queueB.shift() || queueA.shift();
      }

      if (targetStudent) {
        const seatLabel = `R${r + 1}-C${c + 1}`;
        const alloc: AllocatedSeat = {
          id: 'seat_' + Math.random().toString(36).substring(2, 10),
          examScheduleId,
          roomId: room.id,
          studentId: targetStudent.id,
          studentRoll: targetStudent.rollNumber,
          studentName: targetStudent.name,
          departmentCode: targetStudent.departmentCode,
          rowNum: r + 1,
          colNum: c + 1,
          seatLabel,
        };
        matrix[r][c] = alloc;
        allocations.push(alloc);
      }
    }
  }

  const overflowStudents = [...queueA, ...queueB];

  // 4. Invariant Verification: Ensure NO adjacent students from the same department
  let collisionsFound = 0;
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      const current = matrix[r][c];
      if (!current) continue;

      // Check right neighbor
      if (c + 1 < room.cols) {
        const right = matrix[r][c + 1];
        if (right && right.departmentCode === current.departmentCode) {
          collisionsFound++;
        }
      }

      // Check bottom neighbor
      if (r + 1 < room.rows) {
        const bottom = matrix[r + 1][c];
        if (bottom && bottom.departmentCode === current.departmentCode) {
          collisionsFound++;
        }
      }
    }
  }

  // 5. Atomic database persistence via SQL Transaction
  await transaction(async (tx) => {
    if (clearExisting !== false) {
      await tx.execute(
        'DELETE FROM seat_allocations WHERE exam_schedule_id = ? AND room_id = ?',
        [examScheduleId, room.id]
      );
    }

    for (const alloc of allocations) {
      await tx.execute(
        `INSERT INTO seat_allocations (id, exam_schedule_id, room_id, student_id, row_num, col_num, seat_label)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          alloc.id,
          alloc.examScheduleId,
          alloc.roomId,
          alloc.studentId,
          alloc.rowNum,
          alloc.colNum,
          alloc.seatLabel,
        ]
      );
    }
  });

  return {
    success: true,
    totalSeatsInRoom: room.rows * room.cols,
    totalAllocated: allocations.length,
    allocatedSeats: allocations,
    overflowStudents,
    zeroAdjacentCollisionsVerified: collisionsFound === 0,
  };
}
