'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  UserCheck,
  Plus,
  Layers,
  GraduationCap,
  Clock,
  FlaskConical,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

import { Section, Allocation, Course, Faculty, Department } from './types';
import { SectionsTab } from './components/SectionsTab';
import { CoursesTab } from './components/CoursesTab';
import { AllocationsTab } from './components/AllocationsTab';
import { SectionModal } from './components/SectionModal';
import { CourseModal } from './components/CourseModal';
import { TimeOffModal } from '@/components/timetable/TimeOffModal';
import { LessonsModal } from '@/app/schedule/components/LessonsModal';

export default function SectionsPage() {
  const { toast } = useToast();

  const [sections, setSections] = useState<Section[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Sub-Tab: 'SECTIONS' | 'COURSES' | 'MAPPINGS'
  const [activeTab, setActiveTab] = useState<'SECTIONS' | 'COURSES' | 'MAPPINGS'>('SECTIONS');

  // Preselected section when navigating from Sections tab to Allocations
  const [targetSectionIdForMapping, setTargetSectionIdForMapping] = useState<string | undefined>(undefined);

  // Modal States
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Time-Off Availability Modal State
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [timeOffSection, setTimeOffSection] = useState<Section | null>(null);

  // Lessons & Batches Modal State
  const [isLessonsModalOpen, setIsLessonsModalOpen] = useState(false);

  // Fetch Master Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [secRes, allocRes, deptRes, courseRes, facRes] = await Promise.all([
        fetch('/api/sections'),
        fetch('/api/sections/allocations'),
        fetch('/api/departments'),
        fetch('/api/courses'),
        fetch('/api/faculty'),
      ]);

      const secData = await secRes.json();
      const allocData = await allocRes.json();
      const deptData = await deptRes.json();
      const courseData = await courseRes.json();
      const facData = await facRes.json();

      if (secRes.ok) setSections(secData.sections || []);
      if (allocRes.ok) setAllocations(allocData.allocations || []);
      if (deptRes.ok) setDepartments(deptData.departments || []);
      if (courseRes.ok) setCourses(courseData.courses || []);
      if (facRes.ok) setFaculty(facData.faculty || []);
    } catch {
      toast.error('Failed to load curriculum and section data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Section Modal
  const handleOpenAddSection = () => {
    setEditingSection(null);
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: Section) => {
    setEditingSection(sec);
    setIsSectionModalOpen(true);
  };

  // Handlers for Course Modal
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  // Shortcut from Sections tab to Map Course in Allocations tab
  const handleMapCourseShortcut = (sec: Section) => {
    setTargetSectionIdForMapping(sec.id);
    setActiveTab('MAPPINGS');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Aggregate Stats
  const totalStudents = sections.reduce((acc, s) => acc + (s.strength || 0), 0);
  const avgClassSize = sections.length > 0 ? Math.round(totalStudents / sections.length) : 0;
  const configuredSemesters = new Set(sections.map((s) => s.semester)).size;

  const theoryCourses = courses.filter((c) => (c.span || 1) <= 1).length;
  const labCourses = courses.filter((c) => (c.span || 1) > 1).length;
  const totalWeeklyHours = courses.reduce((acc, c) => acc + (c.periods_per_week || 0), 0);

  const assignedFacultyCount = new Set(allocations.map((a) => a.faculty_id)).size;
  const totalTeachingHours = allocations.reduce((acc, a) => acc + (a.periods_per_week || 0), 0);
  const unmappedSectionsCount = sections.filter(
    (s) => !allocations.some((a) => a.section_id === s.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-red-700" />
            Curriculum, Sections & Allocations
          </h1>
        </div>

        {/* Dynamic Contextual Action Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'SECTIONS' && (
            <Button onClick={handleOpenAddSection} variant="primary" className="text-xs shrink-0">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Student Section
            </Button>
          )}

          {activeTab === 'COURSES' && (
            <Button onClick={handleOpenAddCourse} variant="primary" className="text-xs shrink-0">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Academic Course
            </Button>
          )}

          {activeTab === 'MAPPINGS' && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsLessonsModalOpen(true)} variant="outline" className="text-xs border-zinc-300 hover:border-red-600 hover:text-red-700">
                <FileText className="w-4 h-4 mr-1.5 text-teal-600" />
                Lessons & Batches
              </Button>
              <Button onClick={handleOpenAddCourse} variant="outline" className="text-xs">
                <BookOpen className="w-4 h-4 mr-1.5 text-zinc-600" />
                New Course
              </Button>
              <Button onClick={handleOpenAddSection} variant="primary" className="text-xs">
                <Plus className="w-4 h-4 mr-1.5" />
                New Section
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 max-w-fit">
        <button
          onClick={() => setActiveTab('SECTIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'SECTIONS'
              ? 'bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Sections</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'SECTIONS'
                ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {sections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COURSES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'COURSES'
              ? 'bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Courses</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'COURSES'
                ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('MAPPINGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'MAPPINGS'
              ? 'bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Faculty Allocations</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'MAPPINGS'
                ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {allocations.length}
          </span>
        </button>
      </div>

      {/* Dynamic Contextual KPI Metric Strip (Adapts to Active Tab) */}
      {activeTab === 'SECTIONS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Sections</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{sections.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Enrolled Strength</span>
            <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{totalStudents} Students</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Avg Cohort Size</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{avgClassSize} / section</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Semesters Covered</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{configuredSemesters} Sems</p>
          </div>
        </div>
      )}

      {activeTab === 'COURSES' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Courses</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{courses.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Theory Lectures</span>
            <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{theoryCourses} Subjects</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Lab & Practical</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{labCourses} Labs</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Syllabus Load</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{totalWeeklyHours} hrs/wk</p>
          </div>
        </div>
      )}

      {activeTab === 'MAPPINGS' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Active Mappings</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{allocations.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Assigned Faculty</span>
            <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{assignedFacultyCount} Teachers</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Teaching Hours</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{totalTeachingHours} hrs/wk</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Unmapped Sections</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{unmappedSectionsCount}</p>
          </div>
        </div>
      )}

      {/* Sub-Tab Content */}
      {activeTab === 'SECTIONS' && (
        <SectionsTab
          sections={sections}
          departments={departments}
          loading={loading}
          onRefresh={fetchData}
          onOpenAddModal={handleOpenAddSection}
          onOpenEditModal={handleOpenEditSection}
          onMapCourse={handleMapCourseShortcut}
          onTimeOffSection={(sec) => {
            setTimeOffSection(sec);
            setIsTimeOffModalOpen(true);
          }}
        />
      )}

      {activeTab === 'COURSES' && (
        <CoursesTab
          courses={courses}
          departments={departments}
          loading={loading}
          onRefresh={fetchData}
          onOpenAddModal={handleOpenAddCourse}
          onOpenEditModal={handleOpenEditCourse}
        />
      )}

      {activeTab === 'MAPPINGS' && (
        <AllocationsTab
          allocations={allocations}
          sections={sections}
          courses={courses}
          faculty={faculty}
          departments={departments}
          loading={loading}
          preselectedSectionId={targetSectionIdForMapping}
          onRefresh={fetchData}
        />
      )}

      {/* Section Creation / Edit Modal */}
      <SectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        editingSection={editingSection}
        departments={departments}
        onSaved={fetchData}
      />

      {/* Course Creation / Edit Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        editingCourse={editingCourse}
        departments={departments}
        onSaved={fetchData}
      />

      {/* Section Time-Off & Availability Modal */}
      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
        entityType="SECTION"
        entity={
          timeOffSection
            ? {
                id: timeOffSection.id,
                name: timeOffSection.name,
                code: timeOffSection.department_code,
                time_off: timeOffSection.time_off,
              }
            : null
        }
        onSaved={fetchData}
        workingDays={5}
        periodsCount={8}
      />

      {/* Lessons & Batches Modal */}
      <LessonsModal
        isOpen={isLessonsModalOpen}
        onClose={() => setIsLessonsModalOpen(false)}
        courses={courses}
        faculty={faculty}
        sections={sections}
        onChanged={fetchData}
      />
    </div>
  );
}
