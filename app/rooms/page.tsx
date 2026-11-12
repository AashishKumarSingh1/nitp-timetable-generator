'use client';

import React, { useState, useEffect } from 'react';
import {
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Grid,
  Building,
  CheckCircle2,
  XCircle,
  Layers,
  CalendarCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { TimeOffModal } from '@/components/timetable/TimeOffModal';

interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  type: 'LECTURE_HALL' | 'CLASSROOM' | 'COMPUTER_LAB' | 'SEMINAR_HALL';
  rows: number;
  cols: number;
  capacity: number;
  is_available: boolean | number;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  time_off?: string | null;
  color?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export default function RoomsPage() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [availFilter, setAvailFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  // Time-Off Availability Modal State
  const [timeOffRoom, setTimeOffRoom] = useState<Room | null>(null);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);

  // Form State with Interactive Capacity Calculator
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    building: 'Main Academic Block',
    floor: 1,
    type: 'LECTURE_HALL',
    rows: 6,
    cols: 6,
    capacity: 36,
    is_available: true,
    department_id: '',
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      }
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchDepartments();
  }, []);

  // Update capacity automatically whenever rows or cols change
  const handleRowsChange = (r: number) => {
    const rows = Math.max(1, r);
    setFormData((prev) => ({
      ...prev,
      rows,
      capacity: rows * prev.cols,
    }));
  };

  const handleColsChange = (c: number) => {
    const cols = Math.max(1, c);
    setFormData((prev) => ({
      ...prev,
      cols,
      capacity: prev.rows * cols,
    }));
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      code: '',
      name: '',
      building: 'Main Academic Block',
      floor: 1,
      type: 'LECTURE_HALL',
      rows: 6,
      cols: 6,
      capacity: 36,
      is_available: true,
      department_id: departments[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      code: room.code,
      name: room.name,
      building: room.building,
      floor: room.floor,
      type: room.type,
      rows: room.rows,
      cols: room.cols,
      capacity: room.capacity,
      is_available: Boolean(room.is_available),
      department_id: room.department_id || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (room: Room) => {
    const nextState = !Boolean(room.is_available);
    try {
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_available: nextState } : r))
      );

      const res = await fetch(`/api/rooms/${room.id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: nextState }),
      });

      if (!res.ok) throw new Error('Failed to update availability');

      toast.info(
        `${room.code} is now marked as ${nextState ? 'Available for classes' : 'Unavailable (Maintenance)'}`
      );
    } catch (err: any) {
      toast.error(err.message);
      fetchRooms();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Please enter Room Code and Name');
      return;
    }

    try {
      setSaving(true);
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast.success(editingRoom ? 'Room updated' : 'Room created successfully');
      setIsModalOpen(false);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!confirm(`Are you sure you want to delete ${room.code} (${room.name})?`)) return;
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete room');
      toast.success('Room deleted');
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = rooms.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.building.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchesAvail =
      availFilter === 'ALL' ||
      (availFilter === 'AVAILABLE' && Boolean(r.is_available)) ||
      (availFilter === 'UNAVAILABLE' && !Boolean(r.is_available));

    return matchesSearch && matchesType && matchesAvail;
  });

  const totalCapacity = rooms.reduce((acc, r) => acc + (Boolean(r.is_available) ? r.capacity : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Actions Bar */}
      <div className="flex items-center justify-end">
        <Button onClick={handleOpenAdd} variant="primary" className="shrink-0 text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Room / Hall
        </Button>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Rooms</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{rooms.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Active Capacity</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{totalCapacity} Desks</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Lecture Theatres</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {rooms.filter((r) => r.type === 'LECTURE_HALL').length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Computer Labs</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {rooms.filter((r) => r.type === 'COMPUTER_LAB').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <Input
            placeholder="Search by code, room name, building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-44 text-xs"
          >
            <option value="ALL">All Room Types</option>
            <option value="LECTURE_HALL">Lecture Halls</option>
            <option value="CLASSROOM">Classrooms</option>
            <option value="COMPUTER_LAB">Computer Labs</option>
            <option value="SEMINAR_HALL">Seminar Halls</option>
          </Select>

          <Select
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            className="w-full sm:w-36 text-xs"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </Select>
        </div>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room Code</th>
                  <th className="py-3 px-4">Name & Location</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Grid (Rows × Cols)</th>
                  <th className="py-3 px-4 text-center">Capacity</th>
                  <th className="py-3 px-4 text-center">Availability Toggle</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-400">
                      Loading rooms...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-400">
                      No matching rooms found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((room) => {
                    const isAvail = Boolean(room.is_available);
                    return (
                      <tr
                        key={room.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          !isAvail ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                          {room.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{room.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            {room.building} · Floor {room.floor}
                            {room.department_code && (
                              <span className="ml-1 text-red-700 dark:text-red-400 font-semibold">
                                ({room.department_code})
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              room.type === 'LECTURE_HALL'
                                ? 'crimson'
                                : room.type === 'COMPUTER_LAB'
                                ? 'purple'
                                : room.type === 'SEMINAR_HALL'
                                ? 'teal'
                                : 'slate'
                            }
                            size="sm"
                          >
                            {room.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-600 dark:text-zinc-300">
                          {room.rows} × {room.cols}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs">
                            {room.capacity} seats
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleAvailability(room)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                              isAvail
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {isAvail ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Available
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Unavailable
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setTimeOffRoom(room);
                                setIsTimeOffModalOpen(true);
                              }}
                              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border ${
                                room.time_off && room.time_off !== '{}'
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                  : 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                              }`}
                              title="Time Off & Availability Matrix"
                            >
                              <CalendarCheck className="w-4 h-4 text-emerald-600" />
                              <span className="hidden sm:inline text-[11px]">Time-Off</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(room)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Edit Room"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(room)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Delete Room"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Room Modal with Compact 2-Column UI/UX */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.code}` : 'Add Room or Lecture Hall'}
        description="Configure location, type, and seating grid capacity"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Room Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Room Code"
                  placeholder="e.g. LH-101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
                <Select
                  label="Room Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="LECTURE_HALL">Lecture Hall</option>
                  <option value="CLASSROOM">Classroom</option>
                  <option value="COMPUTER_LAB">Computer Lab</option>
                  <option value="SEMINAR_HALL">Seminar Hall</option>
                </Select>
              </div>

              <Input
                label="Room Name"
                placeholder="e.g. Aryabhatta Lecture Hall"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Building Block"
                  placeholder="e.g. Main Block"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  required
                />
                <Input
                  label="Floor Number"
                  type="number"
                  min={0}
                  max={15}
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                  required
                />
              </div>

              <Select
                label="Assigned Department (Optional)"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              >
                <option value="">General Institute Shared Facility</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </Select>
            </div>

            {/* Right Column: Interactive Capacity & Desk Matrix */}
            <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-red-700" />
                    Seating Dimensions
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-900 font-mono font-bold text-xs">
                    {formData.capacity} Seats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <Input
                    label="Desk Rows"
                    type="number"
                    min={1}
                    max={25}
                    value={formData.rows}
                    onChange={(e) => handleRowsChange(Number(e.target.value))}
                    required
                  />

                  <Input
                    label="Desk Columns"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.cols}
                    onChange={(e) => handleColsChange(Number(e.target.value))}
                    required
                  />
                </div>

                {/* Compact Matrix Visualizer */}
                <div className="mt-3">
                  <p className="text-[10px] text-zinc-500 mb-1">Grid Blueprint ({formData.rows} rows × {formData.cols} cols):</p>
                  <div className="flex flex-col gap-1 max-h-20 overflow-y-auto p-2 bg-white rounded-xl border border-zinc-200">
                    {Array.from({ length: Math.min(formData.rows, 5) }).map((_, r) => (
                      <div key={r} className="flex gap-1 justify-center">
                        {Array.from({ length: Math.min(formData.cols, 10) }).map((_, c) => (
                          <div
                            key={c}
                            className="w-3 h-2 rounded-xs bg-red-700/60"
                            title={`Row ${r + 1}, Col ${c + 1}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 cursor-pointer hover:bg-zinc-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_available)}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded border-zinc-300 text-red-700 focus:ring-red-600 h-4 w-4"
                />
                <span>Active & Available for Academic Timetable</span>
              </label>

              {editingRoom && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold flex items-center justify-center gap-2 border-dashed border-zinc-300 dark:border-zinc-700 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setTimeOffRoom(editingRoom);
                    setIsTimeOffModalOpen(true);
                  }}
                >
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Configure Availability & Time-Off Matrix</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              {editingRoom ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Classroom Time-Off & Availability Modal */}
      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        entityType="ROOM"
        entity={
          timeOffRoom
            ? {
                id: timeOffRoom.id,
                name: timeOffRoom.name,
                code: timeOffRoom.code,
                time_off: timeOffRoom.time_off,
              }
            : null
        }
        onSaved={fetchRooms}
        workingDays={5}
        periodsCount={8}
      />
    </div>
  );
}
