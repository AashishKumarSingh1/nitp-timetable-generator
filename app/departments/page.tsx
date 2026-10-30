'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  DoorOpen,
  BookOpen,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { TimingSettingsModal } from '@/components/timetable/TimingSettingsModal';

interface Department {
  id: string;
  name: string;
  code: string;
  faculty_count: number;
  room_count: number;
  course_count: number;
}

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      }
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, code: dept.code });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Please enter department name and code');
      return;
    }

    try {
      setSaving(true);
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      toast.success(editingDept ? 'Department updated successfully' : 'Department added successfully');
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete ${dept.name} (${dept.code})? This will delete associated courses and unassign rooms.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete department');
      }
      toast.success('Department deleted');
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalFaculty = departments.reduce((acc, d) => acc + (d.faculty_count || 0), 0);
  const totalRooms = departments.reduce((acc, d) => acc + (d.room_count || 0), 0);
  const totalCourses = departments.reduce((acc, d) => acc + (d.course_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-red-700" />
            Academic Departments Directory
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsTimingModalOpen(true)}
            variant="outline"
            className="shrink-0 text-xs border-zinc-300 hover:border-red-600 hover:text-red-700"
          >
            <Clock className="w-4 h-4 mr-1.5 text-zinc-600" />
            Timing & Lunch Schedule
          </Button>
          <Button onClick={handleOpenAdd} variant="primary" className="shrink-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Departments</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{departments.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Faculty</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{totalFaculty}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Dedicated Rooms</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{totalRooms}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Curriculum Courses</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{totalCourses}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <Input
            placeholder="Search departments by name or code (e.g. CSE)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
          Showing {filtered.length} of {departments.length} departments
        </div>
      </div>

      {/* Departments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Dept Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4 text-center">Faculty Members</th>
                  <th className="py-3 px-4 text-center">Allocated Rooms</th>
                  <th className="py-3 px-4 text-center">Active Courses</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-zinc-400">
                      Loading departments...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-zinc-400">
                      No matching departments found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((dept) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                        <Badge variant="crimson" size="sm">
                          {dept.code}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{dept.name}</p>
                        <p className="text-[11px] text-zinc-500">Academic Branch & Research Unit</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-900/40 text-xs">
                          <Users className="w-3.5 h-3.5 text-red-700" />
                          {dept.faculty_count} Faculty
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs">
                          <DoorOpen className="w-3.5 h-3.5 text-zinc-500" />
                          {dept.room_count} Rooms
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                          {dept.course_count} Courses
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(dept)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Edit Department"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Academic Department' : 'Create New Department'}
        description="Provide department name and official university acronym"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Department Code"
            placeholder="e.g. CSE, ECE, MECH"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            helperText="Short uppercase code used for identification"
          />

          <Input
            label="Department Full Name"
            placeholder="e.g. Computer Science & Engineering"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingDept ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>
      <TimingSettingsModal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
      />
    </div>
  );
}
