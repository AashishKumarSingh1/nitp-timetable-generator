'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  Users,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Clock,
  GraduationCap,
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

interface FacultyMember {
  id: string;
  code: string;
  name: string;
  email: string;
  designation: string;
  department_id: string;
  department_name?: string;
  department_code?: string;
  max_daily_periods: number;
  max_weekly_periods: number;
  assigned_periods?: number;
  time_off?: string | null;
  color?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface DryRunRow {
  index: number;
  code: string;
  name: string;
  email: string;
  departmentCode: string;
  designation: string;
  maxDaily: number;
  maxWeekly: number;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV = `FacultyCode,Name,Email,DepartmentCode,Designation,MaxDaily,MaxWeekly
FAC-CS-01,Dr. Rajesh Sharma,rsharma@college.edu,CSE,Professor,4,16
FAC-CS-02,Dr. Anita Sen,asen@college.edu,CSE,Associate Professor,4,18
FAC-EC-01,Prof. Vikram Roy,vroy@college.edu,ECE,Assistant Professor,3,14
FAC-ME-01,Dr. Manoj Verma,mverma@college.edu,MECH,Professor,4,16`;

export default function FacultyPage() {
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Single Modal State
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    designation: 'Assistant Professor',
    department_id: '',
    max_daily_periods: 4,
    max_weekly_periods: 18,
  });
  const [saving, setSaving] = useState(false);

  // Time-Off Availability Modal State
  const [timeOffFaculty, setTimeOffFaculty] = useState<FacultyMember | null>(null);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);

  // Bulk CSV Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [dryRunRows, setDryRunRows] = useState<DryRunRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facRes, deptRes] = await Promise.all([
        fetch('/api/faculty'),
        fetch('/api/departments'),
      ]);
      const facData = await facRes.json();
      const deptData = await deptRes.json();

      if (facRes.ok) setFaculty(facData.faculty || []);
      if (deptRes.ok) setDepartments(deptData.departments || []);
    } catch {
      toast.error('Failed to load faculty directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingFaculty(null);
    setFormData({
      code: '',
      name: '',
      email: '',
      designation: 'Assistant Professor',
      department_id: departments[0]?.id || '',
      max_daily_periods: 4,
      max_weekly_periods: 18,
    });
    setIsSingleModalOpen(true);
  };

  const handleOpenEdit = (f: FacultyMember) => {
    setEditingFaculty(f);
    setFormData({
      code: f.code,
      name: f.name,
      email: f.email,
      designation: f.designation,
      department_id: f.department_id,
      max_daily_periods: f.max_daily_periods,
      max_weekly_periods: f.max_weekly_periods,
    });
    setIsSingleModalOpen(true);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.email.trim() || !formData.department_id) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      const url = editingFaculty ? `/api/faculty/${editingFaculty.id}` : '/api/faculty';
      const method = editingFaculty ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save faculty');

      toast.success(editingFaculty ? 'Faculty updated' : 'Faculty instructor added');
      setIsSingleModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: FacultyMember) => {
    if (!confirm(`Are you sure you want to remove ${f.name} (${f.code})?`)) return;
    try {
      const res = await fetch(`/api/faculty/${f.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete faculty');
      toast.success('Faculty removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // CSV Parsing & Dry-run Verification
  const processCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateParsedData(results.data as any[]);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      },
    });
  };

  const validateParsedData = (data: any[]) => {
    const existingCodes = new Set(faculty.map((f) => f.code.toUpperCase()));
    const existingEmails = new Set(faculty.map((f) => f.email.toLowerCase()));
    const validDeptCodes = new Set(departments.map((d) => d.code.toUpperCase()));

    const seenInFileCodes = new Set<string>();
    const seenInFileEmails = new Set<string>();

    const rows: DryRunRow[] = data.map((item, idx) => {
      const errors: string[] = [];
      const code = (item.FacultyCode || item.code || '').trim().toUpperCase();
      const name = (item.Name || item.name || '').trim();
      const email = (item.Email || item.email || '').trim().toLowerCase();
      const deptCode = (item.DepartmentCode || item.department || item.dept || '').trim().toUpperCase();
      const designation = (item.Designation || item.designation || 'Assistant Professor').trim();
      const maxDaily = Number(item.MaxDaily || item.max_daily || 4);
      const maxWeekly = Number(item.MaxWeekly || item.max_weekly || 18);

      if (!code) errors.push('Missing Faculty Code');
      if (!name) errors.push('Missing Name');
      if (!email || !email.includes('@')) errors.push('Invalid Email');
      if (!deptCode) {
        errors.push('Missing Department Code');
      } else if (!validDeptCodes.has(deptCode)) {
        errors.push(`Dept Code "${deptCode}" does not exist in database`);
      }

      if (code) {
        if (existingCodes.has(code)) errors.push(`Code "${code}" is already taken in database`);
        if (seenInFileCodes.has(code)) errors.push(`Duplicate code "${code}" in this file`);
        seenInFileCodes.add(code);
      }

      if (email) {
        if (existingEmails.has(email)) errors.push(`Email "${email}" is already registered`);
        if (seenInFileEmails.has(email)) errors.push(`Duplicate email "${email}" in this file`);
        seenInFileEmails.add(email);
      }

      return {
        index: idx + 1,
        code,
        name,
        email,
        departmentCode: deptCode,
        designation,
        maxDaily: isNaN(maxDaily) ? 4 : maxDaily,
        maxWeekly: isNaN(maxWeekly) ? 18 : maxWeekly,
        isValid: errors.length === 0,
        errors,
      };
    });

    setDryRunRows(rows);
    if (rows.length === 0) {
      toast.error('The uploaded CSV file is empty or formatted incorrectly');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportVerified = async () => {
    const validRows = dryRunRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows found to import');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/faculty/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      toast.success(`Successfully imported ${data.count} verified faculty instructors!`);
      setIsBulkModalOpen(false);
      setDryRunRows([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faculty_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filtered = faculty.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || f.department_id === deptFilter;
    return matchesSearch && matchesDept;
  });

  const validCount = dryRunRows.filter((r) => r.isValid).length;
  const invalidCount = dryRunRows.length - validCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-red-700" />
            Faculty Roster & Teaching Caps
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
            <Upload className="w-4 h-4 mr-1.5 text-red-700" />
            CSV Bulk Upload
          </Button>

          <Button onClick={handleOpenAdd} variant="primary" className="text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Faculty
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <Input
            placeholder="Search by instructor name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full sm:w-56 text-xs"
        >
          <option value="ALL">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </Select>
      </div>

      {/* Faculty Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Faculty Code</th>
                  <th className="py-3 px-4">Instructor Name & Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4 text-center">Daily Cap</th>
                  <th className="py-3 px-4 text-center">Weekly Cap</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-zinc-400">
                      Loading faculty directory...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-zinc-400">
                      No instructors match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((f) => (
                    <tr key={f.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700 dark:text-red-400">
                        {f.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</p>
                        <p className="text-[11px] text-zinc-500">{f.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="crimson" size="sm">
                          {f.department_code || 'General'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 text-xs">
                        {f.designation}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                          {f.max_daily_periods} / day
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                          {f.max_weekly_periods} / wk
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900">
                          <Clock className="w-3 h-3" />
                          {f.assigned_periods || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setTimeOffFaculty(f);
                              setIsTimeOffModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border ${
                              f.time_off && f.time_off !== '{}'
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'text-zinc-600 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                            }`}
                            title="Time Off & Availability Matrix"
                          >
                            <CalendarCheck className="w-4 h-4 text-emerald-600" />
                            <span className="hidden sm:inline text-[11px]">Time-Off</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(f)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(f)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Delete"
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

      {/* Single Faculty Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title={editingFaculty ? `Edit Faculty ${editingFaculty.code}` : 'Add Faculty Instructor'}
        description="Configure contact information, designation, and teaching caps"
      >
        <form onSubmit={handleSaveSingle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Faculty Code"
              placeholder="e.g. FAC-CS-01"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
            <Select
              label="Department"
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Full Name"
            placeholder="e.g. Dr. Rajesh Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Official Email"
            type="email"
            placeholder="rsharma@college.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Designation"
            placeholder="e.g. Professor / Associate Professor"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
            <Input
              label="Max Daily Periods"
              type="number"
              min={1}
              max={8}
              value={formData.max_daily_periods}
              onChange={(e) => setFormData({ ...formData, max_daily_periods: Number(e.target.value) })}
              required
            />
            <Input
              label="Max Weekly Periods"
              type="number"
              min={1}
              max={40}
              value={formData.max_weekly_periods}
              onChange={(e) => setFormData({ ...formData, max_weekly_periods: Number(e.target.value) })}
              required
            />
          </div>

          {editingFaculty && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs font-semibold flex items-center justify-center gap-2 border-dashed border-zinc-300 dark:border-zinc-700 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setTimeOffFaculty(editingFaculty);
                  setIsTimeOffModalOpen(true);
                }}
              >
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Configure Availability & Time-Off Matrix</span>
              </Button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setIsSingleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              {editingFaculty ? 'Update Instructor' : 'Save Instructor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Upload Modal with Dry-Run Verification */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Faculty Bulk CSV Importer"
        description="Upload CSV with dry-run syntax and database integrity verification"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Action Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/60">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-700" />
              <span className="text-xs font-semibold text-red-950 dark:text-red-300">
                Required CSV Format: FacultyCode, Name, Email, DepartmentCode, Designation, MaxDaily, MaxWeekly
              </span>
            </div>
            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-red-600 bg-red-50/40 dark:bg-red-950/40'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-red-400 bg-zinc-50/40 dark:bg-zinc-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processCsvFile(e.target.files[0]);
                }
              }}
            />
            <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Drag & Drop faculty CSV file here, or click to browse
            </p>
            <p className="text-xs text-zinc-500 mt-1">Accepts standard .csv files with header row</p>
          </div>

          {/* Dry Run Verification Results */}
          {dryRunRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Dry-Run Verification Preview ({dryRunRows.length} Rows)
                  </h4>
                  <Badge variant="emerald" size="sm">
                    {validCount} Ready to Import
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="rose" size="sm">
                      {invalidCount} Errors Detected
                    </Badge>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0 font-semibold text-zinc-600 dark:text-zinc-300">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Dept</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Validation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {dryRunRows.map((row) => (
                      <tr
                        key={row.index}
                        className={
                          row.isValid
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'bg-rose-50/40 dark:bg-rose-950/20'
                        }
                      >
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">{row.code || '—'}</td>
                        <td className="py-2 px-3 font-medium">{row.name || '—'}</td>
                        <td className="py-2 px-3">{row.email || '—'}</td>
                        <td className="py-2 px-3">{row.departmentCode || '—'}</td>
                        <td className="py-2 px-3">{row.designation}</td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Verified
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 font-medium">
                              {row.errors.join('; ')}
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

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-500">
              Only verified green rows will be committed to the database.
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={validCount === 0 || isImporting}
                isLoading={isImporting}
                onClick={handleImportVerified}
              >
                Import {validCount} Verified Rows
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Faculty Time-Off & Availability Modal */}
      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        entityType="FACULTY"
        entity={
          timeOffFaculty
            ? {
                id: timeOffFaculty.id,
                name: timeOffFaculty.name,
                code: timeOffFaculty.code,
                time_off: timeOffFaculty.time_off,
              }
            : null
        }
        onSaved={fetchData}
        workingDays={5}
        periodsCount={8}
      />
    </div>
  );
}
