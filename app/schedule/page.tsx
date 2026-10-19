'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  Printer,
  Pin,
  Trash2,
  Clock,
  DoorOpen,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Search,
  Plus,
  Pencil,
  X,
  BookOpen,
  FileDown,
  Settings2,
  Download,
  Eye,
  Sliders,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export interface ClassSession {
  id: string;
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  period_index: number;
  span: number;
  section_name: string;
  is_pinned: boolean | number;
  course_id: string;
  course_code: string;
  course_name: string;
  faculty_id: string;
  faculty_code: string;
  faculty_name: string;
  room_id: string;
  room_code: string;
  room_name: string;
  room_type: string;
  department_code: string;
}

export interface FilterOption {
  id: string;
  name: string;
  code?: string;
  type?: string;
  capacity?: number;
  department_id?: string;
}

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  department_name?: string;
  department_code?: string;
  span?: number;
}

export interface PeriodSlot {
  index: number;
  time: string;
  label: string;
}

export interface TimetableTimingConfig {
  preset: 'NITP_OFFICIAL' | 'STANDARD_8' | 'CUSTOM';
  periods: PeriodSlot[];
  hasLunchBreak: boolean;
  lunchAfterPeriod: number;
  lunchTime: string;
  lunchLabel: string;
}

const NITP_OFFICIAL_PERIODS: PeriodSlot[] = [
  { index: 1, time: '8:30 - 9:25', label: '1' },
  { index: 2, time: '9:30 - 10:25', label: '2' },
  { index: 3, time: '10:30 - 11:25', label: '3' },
  { index: 4, time: '11:30 - 12:25', label: '4' },
  { index: 5, time: '12:30 - 13:25', label: '5' },
  { index: 6, time: '13:30 - 14:25', label: '6' },
  { index: 7, time: '14:30 - 15:25', label: '7' },
  { index: 8, time: '15:30 - 16:25', label: '8' },
  { index: 9, time: '16:30 - 17:25', label: '9' },
];

const STANDARD_8_PERIODS: PeriodSlot[] = [
  { index: 1, time: '09:00 - 10:00', label: '1' },
  { index: 2, time: '10:00 - 11:00', label: '2' },
  { index: 3, time: '11:00 - 12:00', label: '3' },
  { index: 4, time: '12:00 - 13:00', label: '4' },
  { index: 5, time: '14:00 - 15:00', label: '5' },
  { index: 6, time: '15:00 - 16:00', label: '6' },
  { index: 7, time: '16:00 - 17:00', label: '7' },
  { index: 8, time: '17:00 - 18:00', label: '8' },
];

const DEFAULT_TIMING_CONFIG: TimetableTimingConfig = {
  preset: 'NITP_OFFICIAL',
  periods: NITP_OFFICIAL_PERIODS,
  hasLunchBreak: true,
  lunchAfterPeriod: 5,
  lunchTime: '12:30 - 13:25',
  lunchLabel: 'LUNCH BREAK',
};

const DAYS: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY')[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Tu',
  WEDNESDAY: 'We',
  THURSDAY: 'Th',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

export default function SchedulePage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [allSessions, setAllSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Selection
  const [filterMode, setFilterMode] = useState<'SECTION' | 'CLASSROOM' | 'FACULTY'>('SECTION');
  const [selectedSection, setSelectedSection] = useState('Section A');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  // Dropdown options
  const [rooms, setRooms] = useState<FilterOption[]>([]);
  const [faculty, setFaculty] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sections, setSectionsList] = useState<string[]>(['Section A', 'Section B']);

  // Working days (5 or 6)
  const [workingDays, setWorkingDays] = useState<5 | 6>(5);

  // Timing & Lunch Configuration State
  const [timingConfig, setTimingConfig] = useState<TimetableTimingConfig>(DEFAULT_TIMING_CONFIG);
  const [tempTimingConfig, setTempTimingConfig] = useState<TimetableTimingConfig>(DEFAULT_TIMING_CONFIG);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);

  // Solver Generator Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [solverResult, setSolverResult] = useState<any>(null);

  // Manual Edit / Assignment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [formCourseId, setFormCourseId] = useState('');
  const [formFacultyId, setFormFacultyId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formSectionName, setFormSectionName] = useState('Section A');
  const [formDay, setFormDay] = useState<ClassSession['day']>('MONDAY');
  const [formPeriodIndex, setFormPeriodIndex] = useState(1);
  const [formSpan, setFormSpan] = useState(1);
  const [formIsPinned, setFormIsPinned] = useState(true);
  const [manualConflictNotice, setManualConflictNotice] = useState<string | null>(null);

  // Official Institutional PDF Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'SECTION' | 'FACULTY' | 'ROOM'>('SECTION');
  const [exportScope, setExportScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [exportSpecificSection, setExportSpecificSection] = useState('');
  const [exportSpecificFacultyId, setExportSpecificFacultyId] = useState('');
  const [exportSpecificRoomId, setExportSpecificRoomId] = useState('');
  const [exportInstituteHeader, setExportInstituteHeader] = useState(
    'National Institute of Technology Patna, Ashok Rajpath, Patna, Bihar'
  );
  const [exportFooterDate, setExportFooterDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [exportFooterTag, setExportFooterTag] = useState('aSc Timetables');

  // Load timing configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nitp_timetable_timing_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.periods && parsed.periods.length > 0) {
          setTimingConfig(parsed);
          setTempTimingConfig(parsed);
        }
      }
    } catch {
      // default
    }
  }, []);

  const saveTimingConfiguration = (newCfg: TimetableTimingConfig) => {
    setTimingConfig(newCfg);
    setTempTimingConfig(newCfg);
    try {
      localStorage.setItem('nitp_timetable_timing_config', JSON.stringify(newCfg));
    } catch {
      // silent
    }
    toast.success('Timetable period & lunch schedule updated!');
    setIsTimingModalOpen(false);
  };

  const fetchOptions = async () => {
    try {
      const [rRes, fRes, cRes, sRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/faculty'),
        fetch('/api/courses'),
        fetch('/api/sections'),
      ]);
      const rData = await rRes.json();
      const fData = await fRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();

      if (rRes.ok && rData.rooms) {
        setRooms(rData.rooms);
        if (rData.rooms.length > 0) {
          if (!selectedRoom) setSelectedRoom(rData.rooms[0].id);
          if (!exportSpecificRoomId) setExportSpecificRoomId(rData.rooms[0].id);
        }
      }
      if (fRes.ok && fData.faculty) {
        setFaculty(fData.faculty);
        if (fData.faculty.length > 0) {
          if (!selectedFaculty) setSelectedFaculty(fData.faculty[0].id);
          if (!exportSpecificFacultyId) setExportSpecificFacultyId(fData.faculty[0].id);
        }
      }
      if (cRes.ok && cData.courses) {
        setCourses(cData.courses);
      }
      if (sRes.ok && sData.sections?.length > 0) {
        const secNames = Array.from(new Set(sData.sections.map((s: any) => s.name))) as string[];
        setSectionsList(secNames);
        if (!secNames.includes(selectedSection)) {
          setSelectedSection(secNames[0]);
        }
        if (!exportSpecificSection) {
          setExportSpecificSection(secNames[0]);
        }
      }
    } catch {
      // silent
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      let queryParam = '';
      if (filterMode === 'SECTION' && selectedSection) {
        queryParam = `?sectionName=${encodeURIComponent(selectedSection)}`;
      } else if (filterMode === 'CLASSROOM' && selectedRoom) {
        queryParam = `?roomId=${encodeURIComponent(selectedRoom)}`;
      } else if (filterMode === 'FACULTY' && selectedFaculty) {
        queryParam = `?facultyId=${encodeURIComponent(selectedFaculty)}`;
      }

      const res = await fetch(`/api/schedule${queryParam}`);
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch {
      toast.error('Failed to load schedule grid');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sessions across the whole institution for booklet export
  const fetchAllSessionsForExport = async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (res.ok && data.sessions) {
        setAllSessions(data.sessions);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchAllSessionsForExport();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [filterMode, selectedSection, selectedRoom, selectedFaculty]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysCount: workingDays,
          clearUnpinned: true,
          periodsCount: timingConfig.periods.length,
          lunchAfterPeriod: timingConfig.hasLunchBreak ? timingConfig.lunchAfterPeriod : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setSolverResult(data.result);
      toast.success(
        `Clash-Free Timetable Generated! ${data.result.placedCount} sessions placed (${data.result.placementRate}%)`
      );
      fetchSchedule();
      fetchAllSessionsForExport();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleTogglePin = async (session: ClassSession) => {
    const nextState = !Boolean(session.is_pinned);
    try {
      const res = await fetch(`/api/schedule/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: nextState }),
      });
      if (!res.ok) throw new Error('Failed to update session pin');

      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_pinned: nextState } : s))
      );
      setAllSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_pinned: nextState } : s))
      );
      toast.info(nextState ? 'Session pinned (protected from re-solver)' : 'Session unpinned');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteSession = async (session: ClassSession) => {
    if (!confirm(`Delete ${session.course_code} on ${session.day} (Period ${session.period_index})?`)) return;
    try {
      const res = await fetch(`/api/schedule/${session.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete session');
      toast.success('Class session deleted');
      if (isEditModalOpen && editingSession?.id === session.id) {
        setIsEditModalOpen(false);
      }
      fetchSchedule();
      fetchAllSessionsForExport();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenCreateModal = (day?: ClassSession['day'], period?: number) => {
    setEditingSession(null);
    setFormCourseId(courses[0]?.id || '');
    if (filterMode === 'FACULTY' && selectedFaculty) {
      setFormFacultyId(selectedFaculty);
    } else {
      setFormFacultyId(faculty[0]?.id || '');
    }
    if (filterMode === 'CLASSROOM' && selectedRoom) {
      setFormRoomId(selectedRoom);
    } else {
      setFormRoomId(rooms[0]?.id || '');
    }
    setFormSectionName(filterMode === 'SECTION' ? selectedSection : (sections[0] || 'Section A'));
    setFormDay(day || 'MONDAY');
    setFormPeriodIndex(period || 1);
    setFormSpan(1);
    setFormIsPinned(true);
    setManualConflictNotice(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (session: ClassSession) => {
    setEditingSession(session);
    setFormCourseId(session.course_id);
    setFormFacultyId(session.faculty_id);
    setFormRoomId(session.room_id);
    setFormSectionName(session.section_name);
    setFormDay(session.day);
    setFormPeriodIndex(session.period_index);
    setFormSpan(session.span);
    setFormIsPinned(Boolean(session.is_pinned));
    setManualConflictNotice(null);
    setIsEditModalOpen(true);
  };

  // Live conflict detection in manual modal
  useEffect(() => {
    if (!isEditModalOpen) return;

    const pStart = formPeriodIndex;
    const pEnd = formPeriodIndex + formSpan - 1;
    const lunchAfter = timingConfig.hasLunchBreak ? timingConfig.lunchAfterPeriod : 0;

    if (lunchAfter > 0 && pStart <= lunchAfter && pEnd > lunchAfter) {
      setManualConflictNotice(
        `⚠️ Multi-period class cannot cross the user-defined lunch recess (After Period ${lunchAfter}).`
      );
      return;
    }

    if (pEnd > timingConfig.periods.length) {
      setManualConflictNotice(
        `⚠️ Period exceeds configured timetable limit (Max Period ${timingConfig.periods.length}).`
      );
      return;
    }

    const conflict = sessions.find((s) => {
      if (editingSession && s.id === editingSession.id) return false;
      if (s.day !== formDay) return false;
      const sStart = s.period_index;
      const sEnd = s.period_index + s.span - 1;
      const hasOverlap = Math.max(pStart, sStart) <= Math.min(pEnd, sEnd);
      if (!hasOverlap) return false;

      if (s.room_id === formRoomId) return true;
      if (s.faculty_id === formFacultyId) return true;
      if (s.section_name === formSectionName) return true;
      return false;
    });

    if (conflict) {
      if (conflict.room_id === formRoomId) {
        setManualConflictNotice(
          `⚠️ Room conflict: ${conflict.room_code} is booked by ${conflict.course_code} at Period ${conflict.period_index}.`
        );
      } else if (conflict.faculty_id === formFacultyId) {
        setManualConflictNotice(
          `⚠️ Faculty conflict: ${conflict.faculty_name} is already teaching ${conflict.course_code} at Period ${conflict.period_index}.`
        );
      } else if (conflict.section_name === formSectionName) {
        setManualConflictNotice(
          `⚠️ Section conflict: ${conflict.section_name} already has ${conflict.course_code} scheduled at Period ${conflict.period_index}.`
        );
      }
    } else {
      setManualConflictNotice(null);
    }
  }, [
    isEditModalOpen,
    formDay,
    formPeriodIndex,
    formSpan,
    formRoomId,
    formFacultyId,
    formSectionName,
    sessions,
    editingSession,
    timingConfig,
  ]);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSession(true);

      const payload = {
        course_id: formCourseId,
        faculty_id: formFacultyId,
        room_id: formRoomId,
        section_name: formSectionName,
        day: formDay,
        period_index: formPeriodIndex,
        span: formSpan,
        is_pinned: formIsPinned ? 1 : 0,
      };

      let res;
      if (editingSession) {
        res = await fetch(`/api/schedule/${editingSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save class session');
      }

      toast.success(
        editingSession ? 'Schedule updated successfully!' : 'Class assigned to timetable!'
      );
      setIsEditModalOpen(false);
      fetchSchedule();
      fetchAllSessionsForExport();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSession(false);
    }
  };

  const handleOpenExportModal = async () => {
    await fetchAllSessionsForExport();
    setIsExportModalOpen(true);
  };

  const displayDays = workingDays === 6 ? DAYS : DAYS.slice(0, 5);

  const sessionMatrix = new Map<string, ClassSession>();
  const spannedCoverage = new Set<string>();

  for (const s of sessions) {
    sessionMatrix.set(`${s.day}:${s.period_index}`, s);
    if (s.span > 1) {
      for (let p = 1; p < s.span; p++) {
        spannedCoverage.add(`${s.day}:${s.period_index + p}`);
      }
    }
  }

  // Search filtering
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchedSessionIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    const matches = new Set<string>();
    for (const s of sessions) {
      if (
        s.faculty_name.toLowerCase().includes(normalizedQuery) ||
        s.faculty_code.toLowerCase().includes(normalizedQuery) ||
        s.course_code.toLowerCase().includes(normalizedQuery) ||
        s.course_name.toLowerCase().includes(normalizedQuery) ||
        s.room_code.toLowerCase().includes(normalizedQuery) ||
        s.room_name.toLowerCase().includes(normalizedQuery) ||
        s.section_name.toLowerCase().includes(normalizedQuery) ||
        s.department_code?.toLowerCase().includes(normalizedQuery)
      ) {
        matches.add(s.id);
      }
    }
    return matches;
  }, [sessions, normalizedQuery]);

  const matchCount = matchedSessionIds.size;

  // Divide periods around lunch break for interactive screen view
  const lunchAfter = timingConfig.hasLunchBreak ? timingConfig.lunchAfterPeriod : -1;
  const morningPeriods = lunchAfter > 0 ? timingConfig.periods.slice(0, lunchAfter) : timingConfig.periods;
  const afternoonPeriods = lunchAfter > 0 ? timingConfig.periods.slice(lunchAfter) : [];

  // Group all sessions by Section, by Faculty, and by Room for the export booklet
  const sessionsBySection = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of allSessions) {
      if (!map.has(s.section_name)) map.set(s.section_name, []);
      map.get(s.section_name)!.push(s);
    }
    for (const sec of sections) {
      if (!map.has(sec)) map.set(sec, []);
    }
    return map;
  }, [allSessions, sections]);

  const sessionsByFaculty = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of allSessions) {
      if (!map.has(s.faculty_id)) map.set(s.faculty_id, []);
      map.get(s.faculty_id)!.push(s);
    }
    for (const f of faculty) {
      if (!map.has(f.id)) map.set(f.id, []);
    }
    return map;
  }, [allSessions, faculty]);

  const sessionsByRoom = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of allSessions) {
      if (!map.has(s.room_id)) map.set(s.room_id, []);
      map.get(s.room_id)!.push(s);
    }
    for (const r of rooms) {
      if (!map.has(r.id)) map.set(r.id, []);
    }
    return map;
  }, [allSessions, rooms]);

  // Determine which sheets to render in print / export view
  const exportSheets = useMemo(() => {
    if (exportType === 'SECTION') {
      if (exportScope === 'SPECIFIC') {
        return [
          {
            title: exportSpecificSection || 'Section',
            type: 'SECTION' as const,
            sessions: sessionsBySection.get(exportSpecificSection) || [],
          },
        ];
      }
      const list = sections.length > 0 ? sections : Array.from(sessionsBySection.keys());
      return list.map((sec) => ({
        title: sec,
        type: 'SECTION' as const,
        sessions: sessionsBySection.get(sec) || [],
      }));
    } else if (exportType === 'FACULTY') {
      if (exportScope === 'SPECIFIC') {
        const fac = faculty.find((f) => f.id === exportSpecificFacultyId);
        return [
          {
            title: fac ? `Teacher ${fac.name} (${fac.code})` : 'Faculty Timetable',
            type: 'FACULTY' as const,
            sessions: sessionsByFaculty.get(exportSpecificFacultyId) || [],
          },
        ];
      }
      return faculty.map((fac) => ({
        title: `Teacher ${fac.name} (${fac.code})`,
        type: 'FACULTY' as const,
        sessions: sessionsByFaculty.get(fac.id) || [],
      }));
    } else {
      // ROOM / CLASSROOM WISE
      if (exportScope === 'SPECIFIC') {
        const rm = rooms.find((r) => r.id === exportSpecificRoomId);
        return [
          {
            title: rm ? `${rm.code} - ${rm.name}` : 'Classroom Timetable',
            type: 'ROOM' as const,
            sessions: sessionsByRoom.get(exportSpecificRoomId) || [],
          },
        ];
      }
      return rooms.map((rm) => ({
        title: `${rm.code} - ${rm.name}`,
        type: 'ROOM' as const,
        sessions: sessionsByRoom.get(rm.id) || [],
      }));
    }
  }, [
    exportType,
    exportScope,
    exportSpecificSection,
    exportSpecificFacultyId,
    exportSpecificRoomId,
    sections,
    faculty,
    rooms,
    sessionsBySection,
    sessionsByFaculty,
    sessionsByRoom,
  ]);

  // =========================================================================
  // Isolated Print Handler: Guarantees ONLY the timetable content is printed
  // Never prints sidebar, navbars, modals, or app layout wrappers
  // =========================================================================
  const handlePrintIsolated = () => {
    const printContainer = document.getElementById('asc-official-print-container');
    if (!printContainer) {
      window.print();
      return;
    }

    const contentHtml = printContainer.innerHTML;

    // Use an invisible print iframe for complete isolation
    let iframe = document.getElementById('asc-print-isolated-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'asc-print-isolated-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportType === 'SECTION' ? 'Section' : exportType === 'FACULTY' ? 'Faculty' : 'Classroom'} Timetable - NIT Patna</title>
          <style>
            @page {
              size: landscape;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .asc-timetable-sheet {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              width: 100%;
              min-height: 94vh;
              padding: 3mm 0;
              background: #ffffff !important;
            }
            .asc-timetable-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .asc-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000000;
              table-layout: fixed;
            }
            .asc-table th, .asc-table td {
              border: 1.5px solid #000000;
              color: #000000;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print from the isolated frame
    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 200);
  };

  // Open in a fresh standalone clean window
  const handleOpenInNewWindow = () => {
    const printContainer = document.getElementById('asc-official-print-container');
    if (!printContainer) return;

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Popup blocked by browser. Please allow popups or use Direct Print.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportType === 'SECTION' ? 'Class' : exportType === 'FACULTY' ? 'Teacher' : 'Room'} Timetable - NIT Patna</title>
          <style>
            @page { size: landscape; margin: 6mm 8mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 12px;
              background: #f4f4f5;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .print-bar {
              position: sticky;
              top: 0;
              z-index: 100;
              background: #18181b;
              color: white;
              padding: 10px 18px;
              margin: -12px -12px 14px -12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 13px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .print-bar button {
              background: #b91c1c;
              color: white;
              border: none;
              padding: 6px 16px;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
            }
            .asc-timetable-sheet {
              background: #ffffff;
              padding: 16px;
              margin-bottom: 24px;
              border: 1px solid #d4d4d8;
              box-shadow: 0 1px 3px rgba(0,0,0,0.06);
              page-break-after: always;
              break-after: page;
              min-height: 94vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .asc-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000000;
              table-layout: fixed;
            }
            .asc-table th, .asc-table td {
              border: 1.5px solid #000000;
              color: #000000;
            }
            @media print {
              body { background: #ffffff !important; padding: 0 !important; }
              .print-bar { display: none !important; }
              .asc-timetable-sheet { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 2mm 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-bar">
            <span>NIT Patna Official Timetable Export · ${exportSheets.length} Sheet(s)</span>
            <button onclick="window.print()">Print / Save PDF</button>
          </div>
          ${printContainer.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header - No-print in print layout */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-red-700" />
            Classroom Timetable & Academic Scheduler
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manual class assignment, period timing flexibility, clash-free solver & NITP/aSc export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timing Flexibility & Lunch Settings Button */}
          <Button
            onClick={() => {
              setTempTimingConfig({ ...timingConfig });
              setIsTimingModalOpen(true);
            }}
            variant="outline"
            className="text-xs border-zinc-300 hover:border-red-600 hover:text-red-700"
          >
            <Clock className="w-4 h-4 mr-1.5 text-zinc-600" />
            Timing & Lunch Settings
          </Button>

          {/* Official PDF / aSc Timetable Export Center */}
          <Button
            onClick={handleOpenExportModal}
            variant="secondary"
            className="text-xs font-semibold border border-zinc-200"
          >
            <Printer className="w-4 h-4 mr-1.5 text-red-700" />
            Export Official Timetable
          </Button>

          {/* Manual Assignment Modal Button */}
          <Button onClick={() => handleOpenCreateModal()} variant="secondary" className="text-xs">
            <Plus className="w-4 h-4 mr-1.5 text-zinc-700" />
            Manual Assign Class
          </Button>

          {/* Solver Generator Button */}
          <Button onClick={() => setIsGenerateModalOpen(true)} variant="primary" className="text-xs">
            <Sparkles className="w-4 h-4 mr-1.5 text-red-200" />
            Generate Clash-Free
          </Button>
        </div>
      </div>

      {/* Active Timing Notice Bar */}
      <div className="no-print flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-zinc-900 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-red-700" />
            Active Schedule:
          </span>
          <span className="font-medium bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-800 font-mono text-[11px]">
            {timingConfig.periods.length} Periods ({timingConfig.periods[0]?.time.split('-')[0].trim()} -{' '}
            {timingConfig.periods[timingConfig.periods.length - 1]?.time.split('-')[1]?.trim()})
          </span>
          {timingConfig.hasLunchBreak ? (
            <span className="font-medium bg-red-50 text-red-900 px-2 py-0.5 rounded-md border border-red-200 text-[11px]">
              Lunch Recess: After Period {timingConfig.lunchAfterPeriod} ({timingConfig.lunchTime})
            </span>
          ) : (
            <span className="font-medium bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md text-[11px]">
              Continuous Slots (No Lunch Break)
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setTempTimingConfig({ ...timingConfig });
            setIsTimingModalOpen(true);
          }}
          className="text-red-700 font-semibold hover:underline text-[11px] flex items-center gap-1 shrink-0 ml-2"
        >
          Change Timing & Lunch <Clock className="w-3 h-3" />
        </button>
      </div>

      {/* Search Bar & Scope Filter Controls Bar */}
      <Card className="no-print">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by faculty name, course (e.g. CS301), classroom, or student section..."
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 rounded-md"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {normalizedQuery && (
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-900 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-700" />
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'} in grid
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="text-xs py-1.5"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-zinc-100">
            {/* Filter Mode Selector Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-2 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                View Scope:
              </span>
              <button
                onClick={() => setFilterMode('SECTION')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterMode === 'SECTION'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                Section View
              </button>
              <button
                onClick={() => setFilterMode('CLASSROOM')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterMode === 'CLASSROOM'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                Classroom View
              </button>
              <button
                onClick={() => setFilterMode('FACULTY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterMode === 'FACULTY'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                Faculty View
              </button>
            </div>

            {/* Target Dropdown based on active Mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium">Select Target:</span>

              {filterMode === 'SECTION' && (
                <Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="min-w-[180px] text-xs font-semibold"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}

              {filterMode === 'CLASSROOM' && (
                <Select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="min-w-[200px] text-xs font-semibold"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name} ({r.type})
                    </option>
                  ))}
                </Select>
              )}

              {filterMode === 'FACULTY' && (
                <Select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="min-w-[220px] text-xs font-semibold"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} - {f.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Timetable Grid (Screen Interactive Layout) */}
      <Card className="no-print overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[950px]">
              <thead>
                <tr className="bg-zinc-900 text-white text-xs font-semibold">
                  <th className="py-3 px-3 w-28 border-r border-zinc-800 uppercase tracking-wider text-center">
                    Day / Time
                  </th>
                  {morningPeriods.map((p) => (
                    <th key={p.index} className="py-2.5 px-2 border-r border-zinc-800 text-center">
                      <div>Period {p.index}</div>
                      <div className="text-[10px] font-normal text-zinc-400 font-mono">{p.time}</div>
                    </th>
                  ))}

                  {/* Lunch Break Header Column if enabled */}
                  {timingConfig.hasLunchBreak && (
                    <th className="py-2.5 px-2 w-16 bg-red-950/70 text-red-300 border-r border-zinc-800 text-center">
                      <div>LUNCH</div>
                      <div className="text-[9px] font-mono text-red-300">{timingConfig.lunchTime}</div>
                    </th>
                  )}

                  {afternoonPeriods.map((p) => (
                    <th key={p.index} className="py-2.5 px-2 border-r border-zinc-800 text-center">
                      <div>Period {p.index}</div>
                      <div className="text-[10px] font-normal text-zinc-400 font-mono">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs">
                {displayDays.map((day) => (
                  <tr key={day} className="hover:bg-zinc-50/50 transition-colors">
                    {/* Day Column */}
                    <td className="py-4 px-3 font-bold text-zinc-900 bg-zinc-100/70 border-r border-zinc-200 text-center font-mono">
                      {day}
                    </td>

                    {/* Morning Periods */}
                    {morningPeriods.map((period) => {
                      const cellKey = `${day}:${period.index}`;
                      const isCovered = spannedCoverage.has(cellKey);
                      const session = sessionMatrix.get(cellKey);

                      if (isCovered) return null;

                      const isMatched = session ? matchedSessionIds.has(session.id) : false;
                      const hasActiveSearch = normalizedQuery.length > 0;
                      const isDimmed = hasActiveSearch && session && !isMatched;

                      return (
                        <td
                          key={period.index}
                          colSpan={session?.span || 1}
                          className={`p-1.5 border-r border-zinc-200 align-top h-24 transition-opacity ${
                            isDimmed ? 'opacity-35 hover:opacity-100' : ''
                          }`}
                        >
                          {session ? (
                            <SessionGridCard
                              session={session}
                              filterMode={filterMode}
                              isMatched={isMatched}
                              onEdit={() => handleOpenEditModal(session)}
                              onTogglePin={() => handleTogglePin(session)}
                              onDelete={() => handleDeleteSession(session)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModal(day, period.index)}
                              title={`Click to manually assign class on ${day} at ${period.time}`}
                              className="group w-full h-full rounded-xl border border-dashed border-zinc-200 hover:border-red-400 hover:bg-red-50/40 flex flex-col items-center justify-center text-zinc-400 hover:text-red-700 transition-all p-2 text-center"
                            >
                              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-red-700 flex items-center gap-1">
                                <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" />
                                Assign
                              </span>
                              <span className="text-[9px] text-zinc-300 group-hover:text-red-500 font-mono">
                                Free Slot
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Lunch Break Column */}
                    {timingConfig.hasLunchBreak && (
                      <td className="p-1 border-r border-zinc-200 bg-red-50/30 text-center align-middle">
                        <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold text-red-800 tracking-wider">
                          RECESS
                        </span>
                      </td>
                    )}

                    {/* Afternoon Periods */}
                    {afternoonPeriods.map((period) => {
                      const cellKey = `${day}:${period.index}`;
                      const isCovered = spannedCoverage.has(cellKey);
                      const session = sessionMatrix.get(cellKey);

                      if (isCovered) return null;

                      const isMatched = session ? matchedSessionIds.has(session.id) : false;
                      const hasActiveSearch = normalizedQuery.length > 0;
                      const isDimmed = hasActiveSearch && session && !isMatched;

                      return (
                        <td
                          key={period.index}
                          colSpan={session?.span || 1}
                          className={`p-1.5 border-r border-zinc-200 align-top h-24 transition-opacity ${
                            isDimmed ? 'opacity-35 hover:opacity-100' : ''
                          }`}
                        >
                          {session ? (
                            <SessionGridCard
                              session={session}
                              filterMode={filterMode}
                              isMatched={isMatched}
                              onEdit={() => handleOpenEditModal(session)}
                              onTogglePin={() => handleTogglePin(session)}
                              onDelete={() => handleDeleteSession(session)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModal(day, period.index)}
                              title={`Click to manually assign class on ${day} at ${period.time}`}
                              className="group w-full h-full rounded-xl border border-dashed border-zinc-200 hover:border-red-400 hover:bg-red-50/40 flex flex-col items-center justify-center text-zinc-400 hover:text-red-700 transition-all p-2 text-center"
                            >
                              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-red-700 flex items-center gap-1">
                                <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" />
                                Assign
                              </span>
                              <span className="text-[9px] text-zinc-300 group-hover:text-red-500 font-mono">
                                Free Slot
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL CONTAINER: Multi-Page Landscape PDF Booklet */}
      {/* Strictly isolated in globals.css so only this renders when printed */}
      {/* ========================================================================= */}
      <div id="asc-official-print-container" className="hidden">
        <div id="asc-export-sheets-wrapper">
          {exportSheets.map((sheet, idx) => (
            <AscTimetableSheet
              key={`${sheet.type}-${sheet.title}-${idx}`}
              title={sheet.title}
              type={sheet.type}
              instituteHeader={exportInstituteHeader}
              footerDate={exportFooterDate}
              footerTag={exportFooterTag}
              sessions={sheet.sessions}
              periods={timingConfig.periods}
              days={displayDays}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Timing Flexibility & Lunch Definition Settings */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
        title="Schedule Timing & Lunch Recess Flexibility"
        description="Define institution period start times, duration, and when lunch recess occurs"
        maxWidth="xl"
      >
        <div className="space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-2">
              Timing Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTempTimingConfig({
                    preset: 'NITP_OFFICIAL',
                    periods: NITP_OFFICIAL_PERIODS,
                    hasLunchBreak: true,
                    lunchAfterPeriod: 5,
                    lunchTime: '12:30 - 13:25',
                    lunchLabel: 'LUNCH BREAK',
                  });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tempTimingConfig.preset === 'NITP_OFFICIAL'
                    ? 'border-red-700 bg-red-50/70 text-red-950 font-semibold ring-1 ring-red-700'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">NIT Patna Official (9 Periods)</span>
                  {tempTimingConfig.preset === 'NITP_OFFICIAL' && (
                    <Check className="w-3.5 h-3.5 text-red-700" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  8:30 - 17:25 (55 min slots) · Lunch after Period 5
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempTimingConfig({
                    preset: 'STANDARD_8',
                    periods: STANDARD_8_PERIODS,
                    hasLunchBreak: true,
                    lunchAfterPeriod: 4,
                    lunchTime: '13:00 - 14:00',
                    lunchLabel: 'LUNCH BREAK',
                  });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tempTimingConfig.preset === 'STANDARD_8'
                    ? 'border-red-700 bg-red-50/70 text-red-950 font-semibold ring-1 ring-red-700'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Standard University (8 Periods)</span>
                  {tempTimingConfig.preset === 'STANDARD_8' && (
                    <Check className="w-3.5 h-3.5 text-red-700" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  9:00 - 18:00 (60 min slots) · Lunch after Period 4
                </p>
              </button>
            </div>
          </div>

          {/* Lunch Recess Controls */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 block">
                  Lunch Recess Definition
                </span>
                <span className="text-[11px] text-zinc-500">
                  Controls where the lunch break is placed and ensures multi-period labs do not cross it
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempTimingConfig.hasLunchBreak}
                  onChange={(e) =>
                    setTempTimingConfig({
                      ...tempTimingConfig,
                      preset: 'CUSTOM',
                      hasLunchBreak: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-300 text-red-700 focus:ring-red-600 h-4 w-4"
                />
                <span className="text-xs font-bold text-zinc-800">Enable Lunch Break</span>
              </label>
            </div>

            {tempTimingConfig.hasLunchBreak && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                <Select
                  label="When Lunch Break Occurs"
                  value={tempTimingConfig.lunchAfterPeriod}
                  onChange={(e) =>
                    setTempTimingConfig({
                      ...tempTimingConfig,
                      preset: 'CUSTOM',
                      lunchAfterPeriod: Number(e.target.value),
                    })
                  }
                >
                  {tempTimingConfig.periods.map((p) => (
                    <option key={p.index} value={p.index}>
                      After Period {p.index} (around {p.time.split('-')[1]?.trim()})
                    </option>
                  ))}
                </Select>

                <Input
                  label="Lunch Time Label (e.g. 12:30 - 13:25)"
                  value={tempTimingConfig.lunchTime}
                  onChange={(e) =>
                    setTempTimingConfig({
                      ...tempTimingConfig,
                      preset: 'CUSTOM',
                      lunchTime: e.target.value,
                    })
                  }
                  placeholder="e.g. 12:30 - 13:25"
                />
              </div>
            )}
          </div>

          {/* Period Slots Editor Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Period Slots ({tempTimingConfig.periods.length} Periods)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextIdx = tempTimingConfig.periods.length + 1;
                    setTempTimingConfig({
                      ...tempTimingConfig,
                      preset: 'CUSTOM',
                      periods: [
                        ...tempTimingConfig.periods,
                        { index: nextIdx, time: '17:30 - 18:25', label: String(nextIdx) },
                      ],
                    });
                  }}
                  className="text-xs py-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Period
                </Button>
                {tempTimingConfig.periods.length > 5 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const updated = tempTimingConfig.periods.slice(0, -1);
                      setTempTimingConfig({
                        ...tempTimingConfig,
                        preset: 'CUSTOM',
                        periods: updated,
                        lunchAfterPeriod: Math.min(
                          tempTimingConfig.lunchAfterPeriod,
                          updated.length - 1
                        ),
                      });
                    }}
                    className="text-xs py-1 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Last
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-200">
              {tempTimingConfig.periods.map((p, idx) => (
                <div
                  key={p.index}
                  className="p-2.5 flex items-center gap-3 bg-white hover:bg-zinc-50/80 text-xs"
                >
                  <span className="w-16 font-bold text-zinc-900 font-mono text-center px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
                    Period {p.index}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={p.time}
                      onChange={(e) => {
                        const nextPeriods = [...tempTimingConfig.periods];
                        nextPeriods[idx].time = e.target.value;
                        setTempTimingConfig({
                          ...tempTimingConfig,
                          preset: 'CUSTOM',
                          periods: nextPeriods,
                        });
                      }}
                      className="w-full px-2.5 py-1 text-xs border border-zinc-200 rounded-lg font-mono focus:border-red-600 focus:outline-none"
                      placeholder="e.g. 8:30 - 9:25"
                    />
                  </div>
                  {tempTimingConfig.hasLunchBreak && tempTimingConfig.lunchAfterPeriod === p.index && (
                    <Badge variant="crimson" size="sm">
                      Lunch Follows
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTempTimingConfig(DEFAULT_TIMING_CONFIG);
              }}
            >
              Reset to NIT Patna Defaults
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTimingModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => saveTimingConfiguration(tempTimingConfig)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Apply Timing Configuration
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Official Institutional Timetable Export Center (NIT Patna / aSc) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Official Timetable Export Center (NIT Patna / aSc Format)"
        description="Generate scan-accurate, publication-ready PDF booklets with exact high-contrast grids"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Options Row */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Mode: Class-wise, Faculty-wise, or Room-wise */}
              <Select
                label="Timetable Structure Type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as 'SECTION' | 'FACULTY' | 'ROOM')}
              >
                <option value="SECTION">Class / Section-wise Timetable (e.g. APME-1, APME-3)</option>
                <option value="FACULTY">Teacher / Faculty-wise Timetable (e.g. Teacher A Deepak)</option>
                <option value="ROOM">Room / Classroom-wise Timetable (e.g. IC Grnd Flr, CC Lab8)</option>
              </Select>

              {/* Scope */}
              <Select
                label="Export Scope"
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as 'ALL' | 'SPECIFIC')}
              >
                <option value="ALL">
                  All {exportType === 'SECTION' ? 'Sections' : exportType === 'FACULTY' ? 'Faculty Members' : 'Classrooms & Labs'} (Combined Multi-Page PDF Booklet)
                </option>
                <option value="SPECIFIC">
                  Specific {exportType === 'SECTION' ? 'Section' : exportType === 'FACULTY' ? 'Faculty Member' : 'Classroom'} Only
                </option>
              </Select>
            </div>

            {/* Target Select if Specific */}
            {exportScope === 'SPECIFIC' && (
              <div className="pt-2 border-t border-zinc-200">
                {exportType === 'SECTION' && (
                  <Select
                    label="Select Specific Student Section"
                    value={exportSpecificSection}
                    onChange={(e) => setExportSpecificSection(e.target.value)}
                  >
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                )}

                {exportType === 'FACULTY' && (
                  <Select
                    label="Select Specific Faculty Member"
                    value={exportSpecificFacultyId}
                    onChange={(e) => setExportSpecificFacultyId(e.target.value)}
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </Select>
                )}

                {exportType === 'ROOM' && (
                  <Select
                    label="Select Specific Classroom / Laboratory"
                    value={exportSpecificRoomId}
                    onChange={(e) => setExportSpecificRoomId(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} - {r.name} ({r.type})
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            {/* Custom Header & Footer text inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-zinc-200">
              <div className="md:col-span-2">
                <Input
                  label="Institute Header Title"
                  value={exportInstituteHeader}
                  onChange={(e) => setExportInstituteHeader(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Generated Date Tag"
                  value={exportFooterDate}
                  onChange={(e) => setExportFooterDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Live Preview Container */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                Live Scan Preview ({exportSheets.length} {exportSheets.length === 1 ? 'Sheet' : 'Sheets in PDF Booklet'}):
              </span>
              <span className="text-[11px] text-zinc-400">
                Exact Scan Layout · 2px High-Contrast Black Grid
              </span>
            </div>

            {/* Preview Box */}
            <div className="max-h-[360px] overflow-auto border-2 border-zinc-900 rounded-xl bg-white p-3 shadow-inner">
              {exportSheets.slice(0, 2).map((sheet, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                  <AscTimetableSheet
                    title={sheet.title}
                    type={sheet.type}
                    instituteHeader={exportInstituteHeader}
                    footerDate={exportFooterDate}
                    footerTag={exportFooterTag}
                    sessions={sheet.sessions}
                    periods={timingConfig.periods}
                    days={displayDays}
                    isPreview
                  />
                  {idx === 0 && exportSheets.length > 1 && (
                    <div className="my-4 py-2 text-center text-xs text-zinc-400 border-y border-dashed border-zinc-300">
                      --- Page Break: Next Sheet in Multi-Page Booklet ({exportSheets.length - 1} more sheets) ---
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            <span className="text-[11px] text-zinc-500 text-center sm:text-left">
              💡 In the print preview, select <strong>Save as PDF</strong> with <strong>Landscape</strong> orientation.
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInNewWindow}
                title="Open clean printable booklet in a standalone browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Open Standalone Tab
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePrintIsolated}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print / Save PDF ({exportSheets.length} {exportSheets.length === 1 ? 'Page' : 'Pages'})
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: Manual Class Assignment & Edit Modal */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingSession ? 'Edit Scheduled Class Session' : 'Manual Class Assignment'}
        description={
          editingSession
            ? `Modify instructor, room, or timing for ${editingSession.course_code}`
            : 'Assign a course, instructor, and classroom to the institution timetable'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSession} className="space-y-4">
          {manualConflictNotice && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Collision Warning</p>
                <p className="text-[11px] text-amber-800">{manualConflictNotice}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Academic Course"
              value={formCourseId}
              onChange={(e) => setFormCourseId(e.target.value)}
              required
            >
              <option value="" disabled>Select course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.span || 1}h)
                </option>
              ))}
            </Select>

            <Select
              label="Faculty Instructor"
              value={formFacultyId}
              onChange={(e) => setFormFacultyId(e.target.value)}
              required
            >
              <option value="" disabled>Select instructor...</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name}
                </option>
              ))}
            </Select>

            <Select
              label="Classroom / Laboratory"
              value={formRoomId}
              onChange={(e) => setFormRoomId(e.target.value)}
              required
            >
              <option value="" disabled>Select classroom...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name} ({r.type})
                </option>
              ))}
            </Select>

            <Select
              label="Student Section / Class"
              value={formSectionName}
              onChange={(e) => setFormSectionName(e.target.value)}
              required
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Select
              label="Day of Week"
              value={formDay}
              onChange={(e) => setFormDay(e.target.value as any)}
              required
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Select
              label="Start Period (Time Slot)"
              value={formPeriodIndex}
              onChange={(e) => setFormPeriodIndex(Number(e.target.value))}
              required
            >
              {timingConfig.periods.map((p) => (
                <option key={p.index} value={p.index}>
                  Period {p.index} ({p.time})
                </option>
              ))}
            </Select>

            <Select
              label="Duration (Hours / Periods)"
              value={formSpan}
              onChange={(e) => setFormSpan(Number(e.target.value))}
              required
            >
              <option value={1}>1 Hour (Standard Theory Lecture)</option>
              <option value={2}>2 Hours (Laboratory / Practical Block)</option>
              <option value={3}>3 Hours (Extended Workshop)</option>
            </Select>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded border-zinc-300 text-red-700 focus:ring-red-600 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900 flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-red-700 fill-current" />
                    Pin & Protect Session
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Preserves this slot during automated solver runs
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            {editingSession ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleDeleteSession(editingSession)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Session
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={savingSession}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {editingSession ? 'Update Class' : 'Assign to Timetable'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: Automated Solver Generator Modal */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Automated Clash-Free Scheduler Solver"
        description="Run deterministic heuristic solver to schedule lectures, sections, and lab blocks"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-red-700" />
              Deterministic Invariants Enforced:
            </h4>
            <ul className="text-xs text-red-900 space-y-1 list-disc pl-4">
              <li>Zero room double-booking at any period</li>
              <li>Zero faculty teaching overlap across rooms</li>
              <li>Zero student cohort double-booking across courses</li>
              <li>
                Multi-period lab sessions never cross the lunch break (After Period {timingConfig.lunchAfterPeriod})
              </li>
              <li>Faculty daily and weekly period caps strictly respected</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Working Days Schedule"
              value={workingDays}
              onChange={(e) => setWorkingDays(Number(e.target.value) as 5 | 6)}
            >
              <option value={5}>5 Days (Mon - Fri)</option>
              <option value={6}>6 Days (Mon - Sat)</option>
            </Select>

            <div className="flex flex-col justify-end">
              <p className="text-xs text-zinc-500 mb-2">Protected Sessions:</p>
              <Badge variant="crimson" size="md">
                Pinned items are preserved
              </Badge>
            </div>
          </div>

          {solverResult && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Solver Execution Result:
              </div>
              <p>
                Successfully placed <strong>{solverResult.placedCount}</strong> of{' '}
                <strong>{solverResult.totalDemanded}</strong> demands (
                <strong>{solverResult.placementRate}%</strong> placement rate) in{' '}
                {solverResult.durationMs}ms.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={generating}
              onClick={handleGenerate}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Run Solver Algorithm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// =========================================================================
// Official Scan-Accurate NIT Patna / aSc Timetable Sheet Component
// Exact recreation of the scanned image attachments
// =========================================================================
function AscTimetableSheet({
  title,
  type,
  instituteHeader,
  footerDate,
  footerTag,
  sessions,
  periods,
  days,
  isPreview = false,
}: {
  title: string;
  type: 'SECTION' | 'FACULTY' | 'ROOM';
  instituteHeader: string;
  footerDate: string;
  footerTag: string;
  sessions: ClassSession[];
  periods: PeriodSlot[];
  days: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY')[];
  isPreview?: boolean;
}) {
  const matrix = new Map<string, ClassSession>();
  const spanned = new Set<string>();

  for (const s of sessions) {
    matrix.set(`${s.day}:${s.period_index}`, s);
    if (s.span > 1) {
      for (let p = 1; p < s.span; p++) {
        spanned.add(`${s.day}:${s.period_index + p}`);
      }
    }
  }

  return (
    <div
      className={`asc-timetable-sheet bg-white text-black font-sans ${
        isPreview ? 'p-2' : 'p-4'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* 1. Large Bold Centered Title (e.g. APME-1, Teacher A Deepak, IC Grnd Flr) */}
      <div className="text-center mb-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black uppercase">
          {title}
        </h2>
      </div>

      {/* 2. Institute Subtitle */}
      <div className="text-left mb-1">
        <p className="text-[10px] sm:text-[11px] font-normal text-zinc-900 tracking-tight">
          {instituteHeader}
        </p>
      </div>

      {/* 3. The Official High-Contrast Black Table Grid */}
      <table
        className="asc-table w-full border-collapse text-black"
        style={{
          border: '2px solid #000000',
          tableLayout: 'fixed',
        }}
      >
        <thead>
          <tr style={{ height: '42px' }}>
            {/* Empty top-left cell */}
            <th
              style={{
                width: '60px',
                border: '1.5px solid #000000',
                backgroundColor: '#ffffff',
              }}
            />
            {periods.map((p) => (
              <th
                key={p.index}
                style={{
                  border: '1.5px solid #000000',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '2px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="text-sm font-bold text-black leading-tight">
                  {p.label || p.index}
                </div>
                <div className="text-[9px] font-normal text-zinc-800 leading-tight">
                  {p.time}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} style={{ height: '82px' }}>
              {/* Day column: Mo, Tu, We, Th, Fr */}
              <td
                style={{
                  width: '60px',
                  border: '1.5px solid #000000',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                }}
              >
                {DAY_ABBR[day] || day.slice(0, 2)}
              </td>

              {/* Periods Columns */}
              {periods.map((p) => {
                const cellKey = `${day}:${p.index}`;
                if (spanned.has(cellKey)) return null;

                const session = matrix.get(cellKey);

                return (
                  <td
                    key={p.index}
                    colSpan={session?.span || 1}
                    style={{
                      border: '1.5px solid #000000',
                      verticalAlign: 'top',
                      padding: '3px 4px',
                      height: '82px',
                      position: 'relative',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {session ? (
                      type === 'SECTION' ? (
                        /* CLASS/SECTION WISE CELL (Matching Image 1): */
                        /* Top-left: Room | Center: Course | Bottom-right: Faculty */
                        <div className="h-full flex flex-col justify-between text-black select-none">
                          <div className="text-[10px] sm:text-[11px] font-bold text-left leading-tight">
                            {session.room_code}
                          </div>
                          <div className="text-xs sm:text-[13px] font-extrabold text-center uppercase tracking-tight py-1">
                            {session.course_code}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-semibold text-right leading-tight">
                            {session.faculty_name}
                          </div>
                        </div>
                      ) : type === 'FACULTY' ? (
                        /* FACULTY WISE CELL (Matching Image 2): */
                        /* Top-left: Course | Top-right: Room | Center/Bottom: Section */
                        <div className="h-full flex flex-col justify-between text-black select-none">
                          <div className="flex items-start justify-between text-[10px] sm:text-[11px] leading-tight">
                            <span className="font-bold">{session.course_code}</span>
                            <span className="font-semibold text-right">{session.room_code}</span>
                          </div>
                          <div className="text-xs sm:text-[13px] font-extrabold text-center uppercase tracking-tight py-1">
                            {session.section_name}
                          </div>
                          <div className="text-[9px] text-right text-zinc-700">
                            {session.room_name !== session.room_code ? session.room_name : ''}
                          </div>
                        </div>
                      ) : (
                        /* ROOM / CLASSROOM WISE CELL: */
                        /* Top-left: Course | Top-right: Faculty | Center/Bottom: Section */
                        <div className="h-full flex flex-col justify-between text-black select-none">
                          <div className="flex items-start justify-between text-[10px] sm:text-[11px] leading-tight">
                            <span className="font-bold">{session.course_code}</span>
                            <span className="font-semibold text-right">{session.faculty_name}</span>
                          </div>
                          <div className="text-xs sm:text-[13px] font-extrabold text-center uppercase tracking-tight py-1">
                            {session.section_name}
                          </div>
                          <div className="text-[9px] text-right text-zinc-700">
                            {session.course_name}
                          </div>
                        </div>
                      )
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Footer line: Timetable generated: 24-09-2026 | aSc Timetables */}
      <footer className="asc-footer mt-1 flex items-center justify-between text-[10px] text-zinc-900 px-0.5">
        <span>Timetable generated:{footerDate}</span>
        <span>{footerTag}</span>
      </footer>
    </div>
  );
}

// Interactive Screen Grid Session Card
function SessionGridCard({
  session,
  filterMode,
  isMatched,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  session: ClassSession;
  filterMode: 'SECTION' | 'CLASSROOM' | 'FACULTY';
  isMatched?: boolean;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const isLab = session.span > 1;
  const isPinned = Boolean(session.is_pinned);

  return (
    <div
      onClick={onEdit}
      className={`group h-full rounded-xl p-2.5 flex flex-col justify-between transition-all duration-150 border cursor-pointer hover:shadow-md ${
        isMatched
          ? 'ring-2 ring-red-700 bg-red-100/90 border-red-300 shadow-sm scale-[1.01]'
          : isLab
          ? 'bg-stone-50/95 border-stone-300 text-stone-900 hover:border-stone-400 shadow-2xs'
          : 'bg-red-50/90 border-red-200 text-red-950 hover:border-red-300 shadow-2xs'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold font-mono text-[11px] text-red-800">
              {session.course_code}
            </span>
            {isLab && (
              <span className="px-1.5 py-0.2 rounded bg-stone-200 text-[9px] font-bold text-stone-800 border border-stone-300">
                {session.span}h Lab
              </span>
            )}
            {isMatched && (
              <span className="px-1 py-0.2 rounded bg-red-700 text-white text-[8px] font-bold tracking-tight">
                MATCH
              </span>
            )}
          </div>

          <div
            className="no-print flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              title="Edit class assignment"
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-black/5 transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Unpin' : 'Pin to lock slot'}
              className={`p-1 rounded hover:bg-black/10 transition-colors ${
                isPinned ? 'text-red-700' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onDelete}
              title="Delete session"
              className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-black/5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <p className="font-semibold text-[11px] truncate mt-0.5 text-zinc-800" title={session.course_name}>
          {session.course_name}
        </p>
      </div>

      <div className="mt-2 pt-1 border-t border-black/5 space-y-0.5 text-[10px] text-zinc-600">
        {filterMode !== 'CLASSROOM' && (
          <div className="flex items-center gap-1 font-mono">
            <DoorOpen className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="font-bold text-zinc-800">{session.room_code}</span>
          </div>
        )}

        {filterMode !== 'FACULTY' && (
          <div className="flex items-center gap-1 truncate">
            <User className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">{session.faculty_name}</span>
          </div>
        )}

        {filterMode !== 'SECTION' && (
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-700">{session.section_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
