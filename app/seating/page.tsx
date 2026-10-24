'use client';

import React, { useState, useEffect } from 'react';
import {
  Armchair,
  Play,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Users,
  GraduationCap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface ExamSchedule {
  id: string;
  title: string;
  date: string;
  slot: string;
  allocated_students: number;
  rooms_used: number;
}

interface Room {
  id: string;
  code: string;
  name: string;
  rows: number;
  cols: number;
  capacity: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface SeatAllocation {
  id: string;
  exam_schedule_id: string;
  room_id: string;
  student_id: string;
  row_num: number;
  col_num: number;
  seat_label: string;
  student_roll: string;
  student_name: string;
  department_code: string;
  department_name: string;
}

export default function SeatingPage() {
  const { toast } = useToast();

  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocations, setAllocations] = useState<SeatAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selections
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [deptAId, setDeptAId] = useState('');
  const [deptBId, setDeptBId] = useState('');

  // New Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    slot: 'Morning (09:30-12:30)',
  });
  const [savingExam, setSavingExam] = useState(false);

  // Verification results
  const [collisionFreeStatus, setCollisionFreeStatus] = useState<boolean | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [eRes, rRes, dRes] = await Promise.all([
        fetch('/api/seating/exams'),
        fetch('/api/rooms'),
        fetch('/api/departments'),
      ]);

      const eData = await eRes.json();
      const rData = await rRes.json();
      const dData = await dRes.json();

      if (eRes.ok && eData.exams?.length > 0) {
        setExams(eData.exams);
        setSelectedExamId(eData.exams[0].id);
      }
      if (rRes.ok && rData.rooms?.length > 0) {
        setRooms(rData.rooms);
        setSelectedRoomId(rData.rooms[0].id);
      }
      if (dRes.ok && dData.departments?.length > 0) {
        setDepartments(dData.departments);
        setDeptAId(dData.departments[0]?.id || '');
        setDeptBId(dData.departments[1]?.id || dData.departments[0]?.id || '');
      }
    } catch {
      toast.error('Failed to load exam and room resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeating = async () => {
    if (!selectedExamId || !selectedRoomId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/seating?examScheduleId=${selectedExamId}&roomId=${selectedRoomId}`
      );
      const data = await res.json();
      if (res.ok) {
        setAllocations(data.allocations || []);
        verifyCollisions(data.allocations || []);
      }
    } catch {
      toast.error('Failed to load seating matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedExamId && selectedRoomId) {
      fetchSeating();
    }
  }, [selectedExamId, selectedRoomId]);

  const verifyCollisions = (allocs: SeatAllocation[]) => {
    if (allocs.length === 0) {
      setCollisionFreeStatus(null);
      return;
    }
    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    const map = new Map<string, string>();
    for (const a of allocs) {
      map.set(`${a.row_num}:${a.col_num}`, a.department_code);
    }

    let collisions = 0;
    for (let r = 1; r <= targetRoom.rows; r++) {
      for (let c = 1; c <= targetRoom.cols; c++) {
        const cur = map.get(`${r}:${c}`);
        if (!cur) continue;
        const right = map.get(`${r}:${c + 1}`);
        const bottom = map.get(`${r + 1}:${c}`);
        if (right && right === cur) collisions++;
        if (bottom && bottom === cur) collisions++;
      }
    }
    setCollisionFreeStatus(collisions === 0);
  };

  const handleGenerate = async () => {
    if (!selectedExamId || !selectedRoomId || !deptAId || !deptBId) {
      toast.error('Please select Exam, Room, and two Departments');
      return;
    }
    if (deptAId === deptBId) {
      toast.error('Anti-cheating algorithm requires two different departments (e.g. CSE & ECE)');
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch('/api/seating/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examScheduleId: selectedExamId,
          roomId: selectedRoomId,
          departmentAId: deptAId,
          departmentBId: deptBId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seating generation failed');

      toast.success(
        `Anti-Cheating Seating Generated! ${data.result.totalAllocated} students allocated with 0 adjacent clashes.`
      );
      fetchSeating();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.title.trim() || !newExam.date || !newExam.slot) {
      toast.error('Please fill all exam fields');
      return;
    }

    try {
      setSavingExam(true);
      const res = await fetch('/api/seating/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create exam');

      toast.success('Exam session created');
      setIsExamModalOpen(false);
      // Refresh exams
      const eRes = await fetch('/api/seating/exams');
      const eData = await eRes.json();
      if (eRes.ok) {
        setExams(eData.exams);
        setSelectedExamId(data.id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingExam(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  // Build matrix for room
  const matrix: (SeatAllocation | null)[][] = selectedRoom
    ? Array.from({ length: selectedRoom.rows }, () =>
        Array.from({ length: selectedRoom.cols }, () => null)
      )
    : [];

  for (const a of allocations) {
    if (
      selectedRoom &&
      a.row_num >= 1 &&
      a.row_num <= selectedRoom.rows &&
      a.col_num >= 1 &&
      a.col_num <= selectedRoom.cols
    ) {
      matrix[a.row_num - 1][a.col_num - 1] = a;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header - No-print in print layout */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Armchair className="w-6 h-6 text-red-700" />
            Automated Exam Seating Arrangement Planner
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={handlePrint} variant="outline" className="text-xs">
            <Printer className="w-4 h-4 mr-1.5" />
            Print Door Notice (A4)
          </Button>

          <Button onClick={() => setIsExamModalOpen(true)} variant="secondary" className="text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            New Exam Session
          </Button>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <Card className="no-print border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="1. Examination Session"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="text-xs"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.slot})
                </option>
              ))}
            </Select>

            <Select
              label="2. Target Examination Room"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="text-xs"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.code} - {rm.name} ({rm.capacity} seats, {rm.rows}×{rm.cols})
                </option>
              ))}
            </Select>

            <Select
              label="3. Interleaved Group A"
              value={deptAId}
              onChange={(e) => setDeptAId(e.target.value)}
              className="text-xs"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>

            <Select
              label="4. Interleaved Group B"
              value={deptBId}
              onChange={(e) => setDeptBId(e.target.value)}
              className="text-xs"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-red-700" />
              <span>
                Engine pattern: <strong>Checkerboard Zigzag Interleaving</strong>. Eliminates adjacent peers on all 4 axes.
              </span>
            </div>

            <Button
              onClick={handleGenerate}
              variant="primary"
              isLoading={generating}
              className="w-full sm:w-auto text-xs"
            >
              <Play className="w-4 h-4 mr-1.5 fill-current" />
              Generate Anti-Cheating Seating
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invariant Verification Banner */}
      {collisionFreeStatus !== null && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            collisionFreeStatus
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100'
              : 'bg-rose-50/80 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${collisionFreeStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {collisionFreeStatus ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {collisionFreeStatus
                  ? 'Anti-Cheating Invariant: 100% Collision-Free Verified!'
                  : 'Warning: Adjacent Seating Collision Detected'}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {collisionFreeStatus
                  ? 'Zero students from the same department are sitting left, right, in front, or behind each other.'
                  : 'Please re-run the interleaving solver to rebalance the desk matrix.'}
              </p>
            </div>
          </div>
          <Badge variant={collisionFreeStatus ? 'emerald' : 'rose'} size="md">
            {allocations.length} Seats Assigned
          </Badge>
        </div>
      )}

      {/* Printable Door Notice Header (Visible ONLY on print) */}
      <div className="hidden print-only mb-6 text-center border-b-2 border-zinc-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider">
          National Institute of Technology Patna
        </h1>
        <h2 className="text-sm font-bold text-zinc-700 uppercase mt-0.5">
          Office of Controller of Examinations
        </h2>
        <div className="my-2 py-1 px-3 bg-zinc-100 border border-zinc-300 inline-block rounded-md">
          <p className="text-xs font-bold font-mono text-zinc-900">
            EXAMINATION DOOR NOTICE & SEATING PLAN
          </p>
        </div>
        <div className="grid grid-cols-3 text-xs font-semibold text-zinc-800 mt-2 border-t border-zinc-300 pt-2 text-left">
          <p><strong>Session:</strong> {selectedExam?.title}</p>
          <p><strong>Date & Slot:</strong> {selectedExam?.date} · {selectedExam?.slot}</p>
          <p><strong>Hall:</strong> {selectedRoom?.code} ({selectedRoom?.name})</p>
        </div>
      </div>

      {/* 2D Interactive Desk Matrix View */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <Armchair className="w-4 h-4 text-red-700" />
              Room Desk Matrix Layout ({selectedRoom?.code} · {selectedRoom?.rows} Rows × {selectedRoom?.cols} Columns)
            </CardTitle>
            <CardDescription className="text-xs">
              Physically mapped student desk placements in the examination hall
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-900">
              <span className="w-2.5 h-2.5 rounded-full bg-red-700" />
              Group A (CSE)
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              Group B (ECE)
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Teacher Board / Podium Indicator */}
          <div className="max-w-xl mx-auto mb-8 py-2.5 px-4 rounded-xl bg-zinc-900 text-white text-center text-xs font-mono font-bold tracking-widest shadow-sm border border-zinc-800">
            ▲ [ TEACHER PODIUM / EXAMINATION WHITEBOARD ] ▲
          </div>

          {/* Desk Rows Grid */}
          {selectedRoom ? (
            <div className="space-y-4 overflow-x-auto pb-4">
              {matrix.map((rowCells, rIdx) => (
                <div key={rIdx} className="flex items-center gap-3 justify-center min-w-[700px]">
                  <div className="w-14 text-right text-xs font-bold font-mono text-zinc-600 dark:text-zinc-300">
                    Row {rIdx + 1}
                  </div>

                  <div className="flex gap-2.5 flex-1 max-w-4xl justify-center">
                    {rowCells.map((cell, cIdx) => (
                      <div
                        key={cIdx}
                        className={`flex-1 min-w-[100px] max-w-[130px] rounded-xl p-2.5 border transition-all duration-150 flex flex-col justify-between h-20 ${
                          cell
                            ? cell.department_code === 'CSE'
                              ? 'bg-red-50/90 border-red-300 text-red-950 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100 shadow-2xs'
                              : 'bg-zinc-100/90 border-zinc-300 text-zinc-950 dark:bg-zinc-800/60 dark:border-zinc-700 dark:text-zinc-100 shadow-2xs'
                            : 'bg-zinc-50 border-dashed border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-zinc-500">
                            R{rIdx + 1}-C{cIdx + 1}
                          </span>
                          {cell && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                cell.department_code === 'CSE'
                                  ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {cell.department_code}
                            </span>
                          )}
                        </div>

                        {cell ? (
                          <div className="mt-1">
                            <p className="font-mono font-bold text-xs leading-none truncate">
                              {cell.student_roll}
                            </p>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                              {cell.student_name}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-zinc-400 mt-2">
                            Vacant Desk
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">
              Please select a room to view desk matrix.
            </div>
          )}

          {/* Entrance Door Sign Indicator */}
          <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span className="font-mono">◄ MAIN ENTRANCE DOOR</span>
            <span className="font-mono">FIRE EXIT ►</span>
          </div>
        </CardContent>
      </Card>

      {/* New Exam Schedule Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Schedule New Examination Session"
        description="Create an examination title, date, and timeslot"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input
            label="Examination Title"
            placeholder="e.g. End-Term Examinations Autumn 2026"
            value={newExam.title}
            onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
            required
          />

          <Input
            label="Examination Date"
            type="date"
            value={newExam.date}
            onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
            required
          />

          <Select
            label="Time Slot"
            value={newExam.slot}
            onChange={(e) => setNewExam({ ...newExam, slot: e.target.value })}
          >
            <option value="Morning (09:30-12:30)">Morning Session (09:30 - 12:30)</option>
            <option value="Afternoon (14:00-17:00)">Afternoon Session (14:00 - 17:00)</option>
            <option value="Evening (17:30-20:30)">Evening Session (17:30 - 20:30)</option>
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsExamModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingExam}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
