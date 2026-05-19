# AtomQuest Goal Setting & Tracking Portal

A structured, enterprise-grade web portal that digitises the complete **OKR / KPI lifecycle** — from goal creation and managerial approval through quarterly check-ins and performance reporting — eliminating the fragmentation inherent in spreadsheet-based appraisal workflows.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Feature Set](#feature-set)
- [Database Schema](#database-schema)
- [Scoring Engine](#scoring-engine)
- [Role-Based Access Control](#role-based-access-control)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Deployment](#deployment)

---

## Overview

The AtomQuest Portal is built as a single-page React application (SPA) backed by **Supabase** (PostgreSQL + GoTrue Auth) as its Backend-as-a-Service (BaaS) layer. It supports three distinct user personas — **Employee**, **Manager (L1)**, and **Admin / HR** — each with differentiated access controls and workflow capabilities.

The system enforces a full **goal lifecycle**:

```
Draft → Submitted → Approved (Locked) → Quarterly Check-ins → Annual Report
```

Any post-approval mutation is subject to Admin override and creates an immutable **audit log** entry.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React 19 SPA (Vite 7)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Employee   │  │   Manager    │  │   Admin / HR      │   │
│  │  Views      │  │   Views      │  │   Views           │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬─────────┘   │
│         └────────────────┴──────────────────────┘            │
│                     Supabase JS Client v2                    │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS / REST + Realtime
                ┌──────────────▼──────────────┐
                │         Supabase             │
                │  ┌─────────────────────┐     │
                │  │  GoTrue Auth        │     │
                │  │  (JWT / RLS)        │     │
                │  ├─────────────────────┤     │
                │  │  PostgreSQL DB      │     │
                │  │  - profiles         │     │
                │  │  - goal_sheets      │     │
                │  │  - goals            │     │
                │  │  - achievements     │     │
                │  │  - checkins         │     │
                │  │  - audit_logs       │     │
                │  └─────────────────────┘     │
                └─────────────────────────────┘
```

The frontend communicates exclusively via the **Supabase JS SDK** — no custom REST API layer is required. Row Level Security (RLS) policies on Supabase enforce data isolation at the database layer.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Language | JavaScript (JSX) + TypeScript | ES2022 / TS 5.x |
| Styling | Tailwind CSS | 4.x |
| Component Primitives | Radix UI | Various |
| Icon Set | Lucide React | 0.575.x |
| Backend-as-a-Service | Supabase (PostgreSQL + GoTrue) | 2.x SDK |
| State Management | React local state + `useEffect` | — |
| Form Validation | React Hook Form + Zod | 7.x / 3.x |
| Data Visualisation | Recharts | 2.x |
| Date Utilities | date-fns | 4.x |
| Router | TanStack Router | 1.x |
| Linter / Formatter | ESLint 9 + Prettier 3 | — |
| Deployment Target | Cloudflare Pages / Workers | — |

---

## Feature Set

### Phase 1 — Goal Creation & Approval

- **Goal Sheet authoring** — employees create up to **8 goals** per cycle year, each assigned a Thrust Area, Unit of Measurement (UoM), Target, and Weightage
- **System-enforced validation rules:**
  - Total weightage across all goals must equal **100%** (enforced both in UI and pre-submit guards)
  - Minimum weightage per goal: **10%** (hard-blocked on submission)
  - Maximum goals per employee: **8** (enforced at insert and submit)
- **Manager (L1) Approval Workflow** — inline target and weightage editing during review; Approve or Return-for-Rework with mandatory feedback comment
- **Goal locking** — on approval, all goal fields become read-only; further edits require Admin override
- **Shared KPI Push** — Admin broadcasts a departmental KPI to multiple employees simultaneously; recipients may adjust weightage only — Title and Target are immutable

### Phase 2 — Achievement Tracking & Quarterly Check-ins

- **Quarterly update interface** (Q1–Q4) — employees log actual achievement values per quarter; date pickers for Timeline UoM goals; numeric inputs for Numeric/Percentage goals
- **Status selection** per goal per quarter: `Not Started` / `On Track` / `At Risk` / `Completed`
- **Quarter window enforcement** — check-in inputs are locked outside the active window defined in the cycle schedule
- **Manager Check-in module** — Planned vs. Actual table with status badges and computed scores; structured comment field persisted to the `checkins` table
- **Computed Progress Scores** — real-time, weighted aggregate displayed without being treated as a formal rating

### Reporting & Governance

- **Achievement Report** — one-click CSV export covering every employee, every goal, every quarter, with per-goal scores and final weighted totals
- **Completion Dashboard** — real-time admin view showing goal-sheet status (Draft / Submitted / Approved) and Q1–Q4 check-in completion (✅/✗) per employee
- **Audit Trail** — immutable log of all post-lock mutations: Approve, Return, Unlock, Shared Push, Check-in; captures actor, timestamp, change type, and before/after values

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | FK → `auth.users.id` |
| `full_name` | TEXT | |
| `email` | TEXT | |
| `role` | TEXT | `employee` / `manager` / `admin` |
| `manager_id` | UUID | Self-referencing FK → `profiles.id` |

### `goal_sheets`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `employee_id` | UUID | FK → `profiles.id` |
| `cycle_year` | INT | e.g. `2026` |
| `status` | TEXT | `draft` / `submitted` / `approved` |
| `approved_by` | UUID | FK → `profiles.id` |
| `approved_at` | TIMESTAMPTZ | |

### `goals`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `sheet_id` | UUID | FK → `goal_sheets.id` |
| `title` | TEXT | |
| `description` | TEXT | |
| `thrust_area` | TEXT | |
| `uom_type` | TEXT | `min` / `max` / `zero` / `timeline` |
| `target_value` | NUMERIC | Null for Timeline UoM |
| `target_date` | DATE | Null for non-Timeline UoM |
| `weightage` | NUMERIC | 10–100, sum per sheet = 100 |
| `is_shared` | BOOLEAN | True if pushed by Admin/Manager |

### `achievements`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `goal_id` | UUID | FK → `goals.id` |
| `quarter` | TEXT | `Q1` / `Q2` / `Q3` / `Q4` |
| `actual_value` | TEXT | Numeric or ISO date string |
| `status` | TEXT | `not_started` / `on_track` / `at_risk` / `completed` |

*Unique constraint: `(goal_id, quarter)`*

### `checkins`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `sheet_id` | UUID | FK → `goal_sheets.id` |
| `quarter` | TEXT | |
| `manager_id` | UUID | FK → `profiles.id` |
| `comment` | TEXT | |

*Unique constraint: `(sheet_id, quarter)`*

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `entity_type` | TEXT | `goal_sheets` / `goals` / `checkins` |
| `entity_id` | UUID | |
| `changed_by` | UUID | FK → `profiles.id` |
| `change_type` | TEXT | `APPROVE` / `RETURN` / `UNLOCK` / `SHARED_PUSH` / `CHECKIN` / `UPDATE` |
| `old_value` | JSONB | Pre-change snapshot |
| `new_value` | JSONB | Post-change snapshot |
| `changed_at` | TIMESTAMPTZ | |

---

## Scoring Engine

All progress scores are computed client-side by `src/lib/scoring.js` — they are **tracking indicators only** and are not persisted as formal ratings.

| UoM Type | Formula | Description |
|---|---|---|
| `min` | `min(Actual ÷ Target × 100, 100)` | Higher is better (e.g. Sales Revenue) |
| `max` | `min(Target ÷ Actual × 100, 100)` | Lower is better (e.g. TAT, Cost) |
| `zero` | `Actual === 0 ? 100 : 0` | Zero-tolerance (e.g. Safety Incidents) |
| `timeline` | `CompletionDate ≤ Deadline ? 100 : 0` | On-time delivery |

The **Weighted Final Score** aggregates per-goal scores:

```
FinalScore = Σ ( computeScore(goal, achievement) × goal.weightage ) / 100
```

---

## Role-Based Access Control

| Capability | Employee | Manager | Admin |
|---|---|---|---|
| Create / edit goals (draft) | ✅ | — | — |
| Submit goal sheet | ✅ | — | — |
| Recall draft (pre-approval) | ✅ | — | — |
| View own locked goals | ✅ | — | — |
| Log quarterly actuals | ✅ | — | — |
| Review & approve / return sheets | — | ✅ | — |
| Inline edit targets during review | — | ✅ | — |
| Conduct & save quarterly check-ins | — | ✅ | — |
| View team dashboard | — | ✅ | — |
| Push shared KPIs | — | — | ✅ |
| Unlock approved sheets | — | — | ✅ |
| View audit trail | — | — | ✅ |
| Export CSV achievement report | — | — | ✅ |
| View completion dashboard | — | — | ✅ |

---

## Environment Configuration

Create a `.env` file at the project root with the following variables:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

> **Security note:** Only the `anon` (publishable) key is used client-side. Sensitive operations are protected by Supabase Row Level Security (RLS) policies, not by the key itself.

---

## Local Development

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x (or Bun)
- A Supabase project with the schema above applied

### Setup

```bash
# Clone the repository
git clone https://github.com/Sakina152/atomquest.git
cd atomquest/atomquest-portal

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production bundle (Rollup output) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the codebase |
| `npm run format` | Auto-format with Prettier |

---

## Project Structure

```
atomquest-portal/
├── src/
│   ├── components/          # Shared UI primitives
│   │   ├── Sidebar.jsx      # Role-aware navigation sidebar
│   │   ├── RoleSwitcher.jsx # Dev-mode persona switcher
│   │   ├── StatusBadge.jsx  # Goal sheet status pill
│   │   └── Toast.jsx        # Global toast notification system
│   ├── lib/
│   │   ├── supabase.js      # Supabase client singleton
│   │   ├── scoring.js       # Deterministic scoring engine (UoM formulae)
│   │   └── mockData.js      # Cycle windows & seed data constants
│   ├── pages/
│   │   ├── Login.jsx        # Authentication entry point
│   │   ├── employee/
│   │   │   ├── GoalSheet.jsx         # Goal authoring & submission
│   │   │   └── AchievementTracker.jsx # Quarterly actuals entry
│   │   ├── manager/
│   │   │   ├── TeamDashboard.jsx     # Direct reports overview
│   │   │   ├── GoalReview.jsx        # Approve / return goal sheets
│   │   │   └── CheckIn.jsx           # Quarterly check-in module
│   │   └── admin/
│   │       ├── Dashboard.jsx         # Org-wide completion dashboard
│   │       ├── SharedGoalPush.jsx    # Broadcast shared KPIs
│   │       ├── AuditLog.jsx          # Immutable change log
│   │       └── ExportReport.jsx      # CSV achievement report
│   └── App.jsx              # Root component — auth state & routing
├── .env                     # Environment variables (gitignored)
├── vite.config.ts           # Vite + TanStack Start configuration
├── tailwind.config.js       # Tailwind CSS design tokens
└── package.json
```

---

## Deployment

The project is pre-configured for deployment to **Cloudflare Pages** via the `@cloudflare/vite-plugin` integration defined in `wrangler.jsonc`.

```bash
# Production build
npm run build

# Deploy via Wrangler CLI
npx wrangler pages deploy dist/
```

Alternatively, connect the GitHub repository to a Cloudflare Pages project for **CI/CD on every push to `main`**.

Set the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in the Cloudflare Pages dashboard under **Settings → Environment Variables**.

---

## Cycle Schedule

| Phase | Window Opens | Activity |
|---|---|---|
| Goal Setting | 1 May | Creation, Submission & Approval |
| Q1 Check-in | July | Progress Update — Planned vs. Actual |
| Q2 Check-in | October | Progress Update — Planned vs. Actual |
| Q3 Check-in | January | Progress Update — Planned vs. Actual |
| Q4 / Annual | March / April | Final Achievement Capture |

---

*Built for AtomQuest Hackathon 1.0 — In-House Goal Setting & Tracking Portal challenge.*
