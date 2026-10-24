'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  GraduationCap,
  Plus,
  Upload,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Users,
  Building2,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface Student {
  id: string;
  roll_number: string;
  name: string;
  department_id: string;
  department_name: string;
  department_code: string;
  semester: number;
  created_at: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface DryRunStudentRow {
  index: number;
  rollNumber: string;
  name: string;
  departmentCode: string;
  semester: number;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV = `RollNumber,Name,DepartmentCode,Semester
2026-CSE-001,Aarav Sharma,CSE,5
2026-CSE-002,Ananya Verma,CSE,5
2026-ECE-001,Rohan Gupta,ECE,5
2026-MECH-001,Priya Singh,MECH,5`;

export default function StudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  // Single Student Modal State
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    department_id: '',
    semester: 5,
  });
  const [saving, setSaving] = useState(false);

  // Bulk CSV Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [dryRunRows, setDryRunRows] = useState<DryRunStudentRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stuRes, deptRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/departments'),
      ]);
      const stuData = await stuRes.json();
      const deptData = await deptRes.json();

      if (stuRes.ok) setStudents(stuData.students || []);
      if (deptRes.ok) {
        const depts = deptData.departments || [];
        setDepartments(depts);
        if (depts.length > 0 && !formData.department_id) {
          setFormData((prev) => ({ ...prev, department_id: depts[0].id }));
        }
      }
    } catch {
      toast.error('Failed to load student directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (deptFilter && s.department_id !== deptFilter) return false;
      if (semFilter && s.semester !== Number(semFilter)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.department_code.toLowerCase().includes(q)
      );
    });
  }, [students, search, deptFilter, semFilter]);

  // Aggregate stats
  const totalStudents = students.length;
  const uniqueDepts = new Set(students.map((s) => s.department_id)).size;
  const uniqueSemesters = new Set(students.map((s) => s.semester)).size;

  // Single Modal Handlers
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      roll_number: '',
      name: '',
      department_id: departments[0]?.id || '',
      semester: 5,
    });
    setIsSingleModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      name: student.name,
      department_id: student.department_id,
      semester: student.semester,
    });
    setIsSingleModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roll_number.trim() || !formData.name.trim() || !formData.department_id) {
      toast.error('Please enter all required fields.');
      return;
    }

    try {
      setSaving(true);
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast.success(editingStudent ? 'Student updated successfully!' : 'Student added to roster!');
      setIsSingleModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save student';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Remove student ${student.name} (${student.roll_number}) from the system?`)) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student');

      toast.success('Student removed from directory');
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete student';
      toast.error(message);
    }
  };

  // CSV Bulk Upload Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsv(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsv(e.target.files[0]);
    }
  };

  const processCsv = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const deptCodes = new Set(departments.map((d) => d.code.toUpperCase()));
        const existingRolls = new Set(students.map((s) => s.roll_number.toUpperCase()));
        const batchRolls = new Set<string>();

        const dryRun: DryRunStudentRow[] = rows.map((r, idx) => {
          const roll = (r.RollNumber || r.roll_number || r.Roll || '').trim().toUpperCase();
          const name = (r.Name || r.name || '').trim();
          const dept = (r.DepartmentCode || r.department_code || r.Department || '').trim().toUpperCase();
          const sem = Number(r.Semester || r.semester || 5);

          const errors: string[] = [];
          if (!roll) errors.push('Missing Roll Number');
          if (!name) errors.push('Missing Student Name');
          if (!dept) errors.push('Missing Department Code');
          else if (!deptCodes.has(dept)) errors.push(`Unknown department code "${dept}"`);

          if (roll && existingRolls.has(roll)) errors.push('Roll number already exists in DB');
          if (roll && batchRolls.has(roll)) errors.push('Duplicate roll number within CSV file');

          if (roll) batchRolls.add(roll);

          return {
            index: idx + 1,
            rollNumber: roll,
            name,
            departmentCode: dept,
            semester: isNaN(sem) ? 1 : sem,
            isValid: errors.length === 0,
            errors,
          };
        });

        setDryRunRows(dryRun);
      },
      error: () => {
        toast.error('Failed to parse CSV file. Ensure it is a valid format.');
      },
    });
  };

  const handleCommitBulkImport = async () => {
    const validRows = dryRunRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid student rows to import.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            rollNumber: r.rollNumber,
            name: r.name,
            departmentCode: r.departmentCode,
            semester: r.semester,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      toast.success(`Successfully imported ${data.count} students!`);
      setIsBulkModalOpen(false);
      setDryRunRows([]);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template_nitp.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-red-700" />
            Student Cohort Directory
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setDryRunRows([]);
              setIsBulkModalOpen(true);
            }}
            variant="outline"
            className="text-xs"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Bulk CSV Ingest
          </Button>
          <Button onClick={handleOpenAdd} variant="primary" className="text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Student
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <Users className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Enrolled Students</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{totalStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Building2 className="w-5 h-5 text-zinc-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Active Departments</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{uniqueDepts}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Layers className="w-5 h-5 text-zinc-700" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Semesters Configured</p>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{uniqueSemesters}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <Input
                placeholder="Search by student name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <Select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs w-full sm:w-48"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </Select>

            <Select
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="text-xs w-full sm:w-36"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Data Table */}
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Roll Number</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Semester</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-400">
                    Loading student roster...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    <GraduationCap className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="font-semibold">No students found matching your filters.</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Add students individually or import a CSV roster to begin.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {s.roll_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {s.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                        {s.department_code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Sem {s.semester}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 h-7 w-7 text-zinc-500 hover:text-zinc-900"
                        title="Edit Student"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(s)}
                        className="p-1.5 h-7 w-7 text-zinc-400 hover:text-rose-600"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Register New Student'}
        description="Provide student identity, academic department, and enrollment semester."
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <Input
            label="Roll Number"
            placeholder="e.g. 2026-CSE-001"
            value={formData.roll_number}
            onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.toUpperCase() })}
            required
            className="text-xs"
          />

          <Input
            label="Full Name"
            placeholder="e.g. Aarav Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="text-xs"
          />

          <Select
            label="Department / Branch"
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            required
            className="text-xs"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </Select>

          <Select
            label="Current Semester"
            value={formData.semester}
            onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
            required
            className="text-xs"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsSingleModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving} className="text-xs">
              {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Add to Roster'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Ingest Student Roster via CSV"
        description="Upload a CSV file containing RollNumber, Name, DepartmentCode, and Semester columns."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Need the official template?</p>
              <p className="text-[11px] text-zinc-500">Download formatted CSV ready for batch upload</p>
            </div>
            <Button size="sm" variant="outline" onClick={downloadSampleCsv} className="text-xs shrink-0">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-red-500 hover:bg-zinc-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv"
              className="hidden"
            />
            <FileSpreadsheet className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Click to select or drag and drop student roster CSV
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Supports UTF-8 CSV with header row</p>
          </div>

          {dryRunRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Preview ({dryRunRows.filter((r) => r.isValid).length} of {dryRunRows.length} valid)
                </span>
                {dryRunRows.some((r) => !r.isValid) && (
                  <span className="text-rose-600 text-[11px] font-semibold">
                    {dryRunRows.filter((r) => !r.isValid).length} rows have errors
                  </span>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Roll</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Dept</th>
                      <th className="p-2">Sem</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {dryRunRows.map((r) => (
                      <tr key={r.index} className={r.isValid ? '' : 'bg-rose-50/40 dark:bg-rose-950/20'}>
                        <td className="p-2 text-zinc-400">{r.index}</td>
                        <td className="p-2 font-mono font-semibold">{r.rollNumber || '—'}</td>
                        <td className="p-2">{r.name || '—'}</td>
                        <td className="p-2">{r.departmentCode || '—'}</td>
                        <td className="p-2">Sem {r.semester}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium flex items-center gap-1" title={r.errors.join('; ')}>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{r.errors[0]}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkModalOpen(false);
                setDryRunRows([]);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isImporting || dryRunRows.filter((r) => r.isValid).length === 0}
              onClick={handleCommitBulkImport}
              className="text-xs"
            >
              {isImporting
                ? 'Importing...'
                : `Import ${dryRunRows.filter((r) => r.isValid).length} Valid Students`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
