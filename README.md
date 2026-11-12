# 🏛️ NIT Patna Timetable Generator & aPn Master Studio

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20TiDB%20Cloud-00758F?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-NIT%20Patna-red)](#)

An enterprise-grade, constraint-satisfaction university timetable generator and interactive scheduling studio engineered for the **National Institute of Technology Patna (NIT Patna)**. 

The system automates the generation of collision-free, balanced academic schedules across classes, faculty, and lecture halls, featuring the **aPn Master Studio**, interactive availability matrices, conflict diagnostics, examination anti-cheating seating layouts, and official publication-ready PDF exports.

---

## 🌟 Key Highlights & Capabilities

### 1. 🖥️ aPn Master Studio Multi-Track Grid
- **Three Perspective Views**:
  - **Classes / Sections**: Track each academic cohort (e.g. `CSE-I (Sem 5)`, `ECE-II (Sem 5)`).
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
- **Progressive Lab Allocation Fallback**: Accommodates heavy lab cohorts by progressively allowing up to 2 labs per day separated by lunch.

### 5. 🔍 Timetable Conflict Checker & Diagnostics
- One-click institutional schedule audit scanning for:
  - Hard room double-bookings
  - Faculty assignment collisions
  - Department workload caps
  - Time-off matrix violations
- Color-coded severity categorizing issues into **Errors** and **Warnings** with instant navigation to offending records.

### 6. 📄 Official Institutional PDF Booklet Export Center
- **Publication-Ready Layout**: Renders official high-contrast landscape timetable sheets matching the NIT Patna publication format.
- **Vector PDF Generation**: Powered by jsPDF vector rendering—scalable, crisp, and high-resolution.
- **Multi-Page Booklets**: Generates combined multi-page PDF booklets for all sections, all teachers, or all classrooms in a single file.

### 7. 🪑 Anti-Cheating Examination Seating Engine (`lib/seating-engine.ts`)
- Automated seat assignment for examination halls.
- **Adjacent Interleaving Algorithm**: Alternates student cohorts so that no two students from the same department or semester sit adjacent to each other in row or column axes.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack), React 19 |
| **Styling** | Tailwind CSS v4, Lucide Icons, Custom High-Contrast Print Styles |
| **Database** | Pure MySQL (`mysql2/promise`) — TiDB Cloud AWS / AWS RDS / MySQL 8.0+ |
| **Connection Pooling** | Persistent Pool with keep-alive and automatic TLSv1.2 SSL negotiation |
| **Vector Engine** | jsPDF (Landscape Vector PDF Generation) |
| **Algorithms** | Constraint Satisfaction Problem (CSP) Solver, Student Interleaving Seating Generator |
| **Language** | TypeScript 5 (Strict Mode) |

---

## 📂 Project Structure

```text
nitp-timetable-generator/
├── app/
│   ├── api/                      # REST API Endpoints
│   │   ├── auth/                 # JWT & Google OAuth authentication
│   │   ├── courses/              # Course CRUD & curriculum
│   │   ├── departments/          # Academic departments
│   │   ├── faculty/              # Instructor records & time-off
│   │   ├── rooms/                # Classrooms & labs
│   │   ├── schedule/             # Timetable sessions & solver trigger
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
│   ├── globals.css               # Global theme & print specifications
│   └── layout.tsx                # App shell & layout wrapper
├── components/
│   ├── layout/                   # Sidebar navigation & header
│   ├── timetable/                # Time-Off matrix & timing dialogs
│   └── ui/                       # Accessible Button, Input, Modal, Select
├── db/
│   └── schema.sql                # Complete relational MySQL schema
├── lib/
│   ├── auth.ts                   # JWT session management & auth helpers
│   ├── db.ts                     # High-performance MySQL connection pool adapter
│   ├── scheduler.ts              # Constraint-satisfaction timetable solver
│   └── seating-engine.ts         # Anti-cheating exam seating algorithm
├── scripts/
│   ├── init-db.ts                # Database migration & seed setup
│   └── verify-all.ts             # Comprehensive automated test suite
├── .env.example                  # Environment configuration template
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **pnpm**
- **MySQL Database**: TiDB Cloud (AWS), Amazon RDS MySQL, or a local MySQL 8.0+ server

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AashishKumarSingh1/nitp-timetable-generator.git
   cd nitp-timetable-generator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your MySQL credentials and a random JWT secret:
   ```env
   DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl={"rejectUnauthorized":true}
   JWT_SECRET=your-random-48-character-jwt-secret-here
   ```

4. **Initialize & Seed the Database:**
   Creates tables and seeds departments, faculty, rooms, courses, and cohort sections:
   ```bash
   npm run db:init
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3010](http://localhost:3010) in your browser. Default login: `admin@nitp.ac.in` / `AdminPassword123!`.

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), create a **New Project** and import your repository.
3. Add the following **Environment Variables** in Vercel:
   - `DATABASE_URL`: Your full MySQL connection string (e.g. TiDB Cloud or AWS RDS).
   - `JWT_SECRET`: Random 48-byte hex string (generate via `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - `NEXT_PUBLIC_APP_URL`: `https://your-app.vercel.app`.
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: *(Optional)* If using Google SSO.
4. Click **Deploy**.

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

## 👥 Institution & Credits

Developed for the **National Institute of Technology Patna (NIT Patna)** academic coordination and timetable scheduling committees.

- **Institution**: [National Institute of Technology Patna](https://www.nitp.ac.in)
- **Campuses**: Ashok Rajpath Main Campus & Bihta Campus

