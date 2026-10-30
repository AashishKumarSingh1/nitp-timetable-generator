# 🏛️ NIT Patna Timetable Generator & aPn Master Studio

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-NIT%20Patna-red)](#)

An enterprise-grade, constraint-satisfaction university timetable generator and interactive scheduling studio engineered for the **National Institute of Technology Patna (NIT Patna)**. 

The system automates the generation of collision-free, balanced academic schedules across classes, faculty, and lecture halls, featuring the **aPn Master Studio**, interactive availability matrices, conflict diagnostics, and official publication-ready PDF exports.

---

## 🌟 Key Highlights & Capabilities

### 1. 🖥️ aPn Master Studio Multi-Track Grid
- **Three Perspective Views**:
  - **Classes / Sections**: Track each academic cohort (e.g. `CSE-I (Sem 4)`, `ECE-II (Sem 4)`).
  - **Teachers / Faculty**: Track instructor schedules across departments with assigned weekly workloads.
  - **Classrooms / Labs**: Monitor physical lecture halls, computer centers, and specialized laboratories.
- **Multi-Period Spanning**: 2-hour and 3-hour practical and workshop blocks span contiguously across period slots.
- **Parallel Batch Split Cells**: Sub-groups (e.g. `Batch 1` in Software Lab and `Batch 2` in Hardware Lab) split cleanly into stacked cards within the same period without collisions.
- **Interactive Clash & Placement Projection**: Selecting any unplaced lesson dynamically illuminates the master grid with **Green** (valid placement) and **Red** (room occupied, faculty double-booked, or time-off blocked).
- **Session Card Controls**: Pin 📌, Edit ✏️, and Delete 🗑️ shortcuts directly on session card hover.
- **High-Contrast Day Demarcation**: Crisp bold black boundary lines demarcating days for multi-track navigation.

### 2. ⏱️ 3-State Time-Off Availability Matrix
- Replicates the **aPn TimeTables** availability editor:
  - 🟩 **Available** (Regular scheduling)
  - ❓ **Avoid / Conditional** (Allowed only when no alternative slot exists)
  - ❌ **Blocked / Time-Off** (Hard constraint; solver will never schedule in this slot)
- **Granular Controls**: Click any cell to cycle states; toggle full days or periods in one click; quick presets for **Block Morning**, **Block Afternoon**, and **Clear All**.
- Enforced across Instructors (`/faculty`), Classrooms/Labs (`/rooms`), and Student Cohorts (`/sections`).

### 3. 🎯 Flexible Lesson Formats & Distributions
Supports academic curriculum distribution models:
- **"1 hour at a time"** (`1_AT_A_TIME`): All single 1-hour sessions (e.g. 3 periods/wk ➔ `1h + 1h + 1h`).
- **"1 and 2 mix"** (`1_AND_2_MIX`): Blends 2-hour practical/lab blocks with 1-hour theory lectures (e.g. 3 periods/wk ➔ `2h Lab + 1h Lecture`; 4 periods/wk ➔ `2h Lab + 1h + 1h`).
- **"2 hours at a time"** (`2_AT_A_TIME`): Scheduled exclusively as 2-hour lab/studio blocks (e.g. 4 periods/wk ➔ `2h + 2h`).
- **"3 hours at a time"** (`3_AT_A_TIME`): Scheduled as an extended 3-hour workshop or studio.

### 4. 🧮 Constraint-Satisfaction Automated Solver (`lib/scheduler.ts`)
Places complex university workloads with a **100% placement rate** and zero hard invariant violations:
- **Zero Room Double-Booking**: Guarantees no two classes share the same room at the same time.
- **Zero Faculty Collisions**: Prevents simultaneous teaching assignments for any instructor.
- **Zero Adjacent Different-Section Clashes**: Instructors teaching different student cohorts are never scheduled in immediately adjacent periods without travel/prep buffer.
- **Student Workload Invariants**:
  - Daily limit: $\le 7\text{ hours}$ total per day.
  - Theory limit: $\le 5\text{ hours}$ lecture per day.
  - Continuous session limit: $\le 4\text{ hours}$ continuous learning.
- **Zero Lunch Recess Crossings**: Sessions cannot span across the institute lunch break (`12:25 - 13:30`).
- **Student Relief Invariants**:
  - **Zero Isolated 1-Hour Dead Gaps**: Compacted schedules eliminate empty gaps between classes.
  - **Zero Single-Class Days**: Students are never called to campus for only a 1-hour session.
- **Progressive Lab Allocation Fallback**: Accommodates heavy lab cohorts (6–7 labs/week) by progressively allowing up to 2 labs per day separated by lunch.
- **Phase 2D Lunch-Boundary Dead-Gap Resolver**: Detects boundary gaps across lunch and relocates single lectures to clean terminal slots.

### 5. 🔍 Timetable Conflict Checker & Diagnostics
- One-click institutional schedule audit scanning for:
  - Hard room double-bookings
  - Faculty assignment collisions
  - Department workload caps
  - Time-off matrix violations
- Color-coded severity categorizing issues into **Errors** and **Warnings** with instant navigation to offending records.

### 6. 📄 Official Institutional PDF Booklet Export Center
- **Publication-Ready Layout**: Renders official high-contrast landscape timetable sheets matching the NIT Patna publication format.
- **Vector PDF Generation**: Powered by jsPDF vector rendering—immune to canvas rendering errors, scalable, and crisp.
- **Multi-Page Booklets**: Generates combined multi-page PDF booklets for all sections, all teachers, or all classrooms in a single file.
- **Customizable Institutional Watermark & Headers**:
  - Institute Header Title (e.g. *National Institute of Technology Patna, Ashok Rajpath, Patna, Bihar*)
  - Generated Date Stamp
  - Watermark / Footer Tag (customizable, defaults to `aPn Timetables`)

### 7. 🪑 Anti-Cheating Examination Seating Engine (`lib/seating-engine.ts`)
- Automated seat assignment for examination halls.
- **Adjacent Interleaving Algorithm**: Alternates student cohorts so that no two students from the same department or semester sit adjacent to each other.

---

## 🏛️ Authentic NIT Patna Bihta Campus Dataset (Jan–June 2026)

The system includes pre-loaded data for the **Even Semester (2025–26 / Jan–June 2026)** at NIT Patna Bihta Campus:
- **18 Real CSE Faculty Members** (with official `@nitp.ac.in` handles):
  - Dr. Amit Kumar Singh, Prof. M. P. Singh, Dr. J. P. Singh, Dr. Udai Pratap Rao, Dr. Kakali Chatterjee, Dr. Anil Kumar Dudyala, Dr. Dinesh Dash, Dr. Suddhasil De, Dr. Somaraju Suvvari, Dr. Mukesh Kumar, Dr. Bhaskar Mandal, Dr. Ditipriya Sinha, Dr. B. Balaji Naik, Dr. Krishna Kumar Sethi, Dr. Antriksh Goswami, Dr. Santosh Kumar Tripathy, Dr. Abhimanyu Kumar, Dr. Dashrath Mahto.
- **10 Academic Sections**:
  - `CSE-I (Sem 4)`, `CSE-II (Sem 4)`, `CSE-III+DD (Sem 4)`
  - `CSE-I (Sem 6)`, `CSE-II (Sem 6)`, `CSE-III+DD (Sem 6)`
  - `DD+M.Tech DS (Sem 8/2)`, `DD+M.Tech CS (Sem 8/2)`
  - `ECE-I (Sem 4)`, `ECE-II (Sem 4)` (ECE Servicing cohorts)
- **31 Curriculum Courses**: AI, Computer Networks, Automata Theory & Compiler Design, Algorithms, Data Mining, Cloud Computing, Deep Learning, NLP, IoT, Cyber Forensics, etc.
- **44 Teaching Allocations**: 100% placed and verified with 0 clashes.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack), React 19 |
| **Styling** | Tailwind CSS v4, Lucide Icons, Custom High-Contrast Print Styles |
| **Database** | SQLite via Node.js native engine / SQLite3 (`data/scheduler.db`) |
| **Vector Engine** | jsPDF (Landscape Vector PDF Generation) |
| **Algorithms** | Constraint Satisfaction Problem (CSP) Solver, Student Interleaving Seating Generator |
| **Language** | TypeScript 5 (Strict Mode) |

---

## 📂 Project Structure

```text
nitp-timetable-generator/
├── app/
│   ├── api/                      # REST API Endpoints
│   │   ├── courses/              # Course CRUD & curriculum
│   │   ├── departments/          # Academic departments
│   │   ├── faculty/              # Instructor records & time-off
│   │   ├── rooms/                # Classrooms & labs
│   │   ├── schedule/             # Timetable sessions & solver trigger
│   │   │   ├── [id]/             # Single session edit/delete
│   │   │   └── generate/         # Solver invocation
│   │   ├── seating/              # Exam seating arrangement
│   │   ├── sections/             # Student cohorts & allocations
│   │   └── students/             # Enrolled students directory
│   ├── dashboard/                # Analytics & executive metrics
│   ├── departments/              # Department settings & timing rules
│   ├── faculty/                  # Faculty directory & time-off matrix
│   ├── rooms/                    # Classroom & laboratory management
│   ├── schedule/                 # Timetable Studio & Classic views
│   │   ├── components/           # MasterGrid, Ribbon, Holding Tray, Modals
│   │   ├── page.tsx              # Main schedule page & PDF booklet export
│   │   └── types.ts              # Timetable TypeScript interfaces
│   ├── seating/                  # Exam seating layout designer
│   ├── sections/                 # Sections, courses & teaching allocations
│   ├── globals.css               # Global theme, cursor rules & print specs
│   └── layout.tsx                # App shell & layout wrapper
├── components/
│   ├── layout/                   # Sidebar navigation & header
│   ├── timetable/                # Time-Off matrix & timing dialogs
│   └── ui/                       # Accessible Button, Input, Modal, Select
├── data/
│   ├── scheduler.db              # Active SQLite database (Bihta 2026 data)
│   └── scheduler.db.bak_synthetic# Backup of synthetic test database
├── db/
│   └── schema.sql                # Complete relational database DDL
├── lib/
│   ├── db.ts                     # Database connection helper
│   ├── scheduler.ts              # Constraint-satisfaction timetable solver
│   └── seating-engine.ts         # Anti-cheating exam seating algorithm
├── scripts/
│   ├── init-db.ts                # Database migration & schema setup
│   ├── seed-bihta-2026.ts        # Bihta Campus Even Sem 2026 data seeder
│   └── verify-all.ts             # Comprehensive automated test suite
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AashishKumarSingh1/nitp-timetable-generator.git
   cd nitp-timetable-generator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   ```bash
   npm run db:init
   ```

4. **Seed authentic NIT Patna Bihta Campus (Even Semester 2026) data:**
   ```bash
   npx tsx scripts/seed-bihta-2026.ts
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) (or the active port shown in terminal) in your browser.

---

## 🧪 Verification & Acceptance Suite

The project includes an automated end-to-end acceptance test suite that validates the database layer, constraint solver invariants, and anti-cheating seating algorithm.

Run the verification suite:
```bash
npm run verify
```

### Expected Output:
```text
🚀 Running Comprehensive Acceptance Verification Suite...

1️⃣ Checking Database Tables & Connections...
   - Users in DB: 2
   - Departments: 5
   - Rooms: 25
   - Faculty Members: 45
   - Students for Seating: 36
   ✅ Pure SQL Database Layer: PASSED

2️⃣ Running Constraint-Satisfaction Timetable Solver...
   - Solver placed 120 of 120 demands in 74ms
   - Placement Rate: 100%
   - Room Collisions: 0
   - Faculty Collisions: 0
   ✅ Collision-Free Invariant: 100% VERIFIED
   - Verifying No-Adjacent-Diff-Sections Invariant for Faculty...
   - Adjacent Different-Section Faculty Clashes: 0
   ✅ No-Adjacent-Diff-Sections Invariant: 100% VERIFIED
   - Verifying Student Workload & Session Invariants...
   - Student Daily Total Violations (>7h): 0
   - Student Theory Teaching Violations (>5h): 0
   - Student Continuous Session Violations (>4h): 0
   - Lunch Recess Crossing Violations: 0
   ✅ Student Workload & Session Invariants: 100% VERIFIED
   - Verifying Student Relief & Anti-Gap Invariants...
   - Isolated 1-Hour Gaps: 0
   - Single-Class Days (<2h): 0
   ✅ Student Relief & Anti-Gap Invariants: 100% VERIFIED

3️⃣ Running Anti-Cheating Seating Interleaving Algorithm...
   - Total Room Capacity: 36
   - Allocated Students: 36
   - Overflow Students: 0
   - Zero Adjacent Collisions Verified: true
🎉 ALL SYSTEM ACCEPTANCE CHECKS PASSED WITH 100% SUCCESS!
```

---

## 📦 Production Build

To verify full TypeScript compilation and static/dynamic route generation:

```bash
npm run build
```

This compiles all 37 application routes with zero errors using Next.js Turbopack.

---

## 📋 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/schedule` | `GET` | Fetch all scheduled class sessions with course, room, and faculty details |
| `/api/schedule` | `POST` | Assign or manually schedule a new class session |
| `/api/schedule/generate` | `POST` | Trigger the automated constraint-satisfaction solver |
| `/api/schedule/[id]` | `PUT` | Update an existing scheduled session (with self-collision exclusion) |
| `/api/schedule/[id]` | `DELETE` | Remove a scheduled session from the grid |
| `/api/faculty` | `GET`, `POST` | List and create faculty members with department assignment |
| `/api/faculty/[id]` | `PUT`, `DELETE` | Update faculty details and persist 3-state time-off availability |
| `/api/rooms` | `GET`, `POST` | List classrooms/labs with capacities and types |
| `/api/rooms/[id]` | `PUT`, `DELETE` | Update room configuration and time-off availability |
| `/api/sections` | `GET`, `POST` | List and manage student cohorts and batches |
| `/api/sections/allocations` | `GET`, `POST` | Manage curriculum course-to-faculty teaching assignments |
| `/api/seating` | `GET`, `POST` | Generate anti-cheating interleaved exam seating arrangements |

---

## 📜 Invariant Specification Matrix

| Invariant | Type | Solver Handling | Verification Status |
|---|---|---|---|
| **Room Double-Booking** | Hard | Candidate rejection | 0 Collisions (100% Passed) |
| **Faculty Double-Booking** | Hard | Candidate rejection | 0 Collisions (100% Passed) |
| **Faculty Adjacent Diff-Sections** | Hard | Consecutive period clash check | 0 Clashes (100% Passed) |
| **Time-Off Constraints** | Hard | Candidate rejection on blocked periods | Enforced |
| **Student Daily Cap ($\le 7\text{h}$)** | Hard | Rejection if total hours exceed cap | 0 Violations (100% Passed) |
| **Theory Daily Cap ($\le 5\text{h}$)** | Hard | Rejection if theory hours exceed cap | 0 Violations (100% Passed) |
| **Continuous Limit ($\le 4\text{h}$)** | Hard | Enforces rest/break periods | 0 Violations (100% Passed) |
| **Lunch Break Barrier** | Hard | Sessions cannot cross `12:25 - 13:30` | 0 Violations (100% Passed) |
| **Isolated 1-Hour Dead Gaps** | Soft / Post | Phase 2A/2B compaction & Phase 2D resolver | 0 Gaps (100% Passed) |
| **Single-Hour Class Days** | Soft / Post | Phase 2B multi-hour attachment | 0 Violations (100% Passed) |
| **Exam Anti-Cheating** | Hard | Interleaving matrix validation | 0 Collisions (100% Passed) |

---

## 👥 Contributors & Acknowledgements

Developed for the **National Institute of Technology Patna (NIT Patna)** academic coordination and timetable scheduling committees.

- **Institution**: [National Institute of Technology Patna](https://www.nitp.ac.in)
- **Campus**: Ashok Rajpath Main Campus & Bihta Campus
