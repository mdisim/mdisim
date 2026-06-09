# ANGEL D.C. — Phase 2 Architecture Document

**Version:** 2.0  
**Date:** 2026-06-09  
**Current Phase:** Phase 1 Complete (Auth, Projects, BOQ, Costs, Contractors, Payments)

---

## System Overview

ANGEL D.C. is a construction project management SaaS built for quantity surveyors, site engineers, and construction managers. The platform covers the full project lifecycle from takeoff and BOQ creation through site execution, cash flow, and reporting.

### Current Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deployment:** Vercel
- **Auth:** Supabase Auth (email/password, OAuth)

### Existing Core Tables
```
auth.users          ← Supabase managed
projects            ← user_id FK
boq_items           ← project_id FK, computed total_amount
contractors         ← user_id FK
cost_entries        ← project_id FK, boq_item_id FK
contractor_payments ← project_id FK, contractor_id FK
```

---

## Implementation Priority Matrix

| Priority | Module | Complexity | Value | Dependency |
|---|---|---|---|---|
| 1 | **Site Daily Reports** | Medium | Very High | projects |
| 2 | **Concrete Management** | Medium | High | projects, boq_items |
| 3 | **Steel Management** | Medium | High | projects, boq_items |
| 4 | **Cash Flow Management** | High | Very High | projects, cost_entries, contractor_payments |
| 5 | **Quantity Takeoff System** | High | Very High | projects, boq_items |
| 6 | **BOQ Automation** | High | High | boq_items, takeoff |
| 7 | **PDF Plan Measurement** | Very High | High | takeoff |
| 8 | **Student Portal** | Medium | Medium | standalone |
| 9 | **AI Quantity Surveyor** | Very High | Very High | all modules |

---

## Module 1 — Site Daily Reports (SDR)

### Purpose
Digital site diary: daily workforce, equipment, weather, progress, and issues log per project.

### Database Tables

```sql
-- Daily reports header
CREATE TABLE site_daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  weather VARCHAR(50),                    -- sunny, cloudy, rainy, stormy
  temperature_high DECIMAL(5,1),
  temperature_low DECIMAL(5,1),
  wind_speed VARCHAR(50),
  work_status VARCHAR(50) DEFAULT 'normal', -- normal, delayed, suspended, holiday
  delay_reason TEXT,
  general_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'draft',     -- draft, submitted, approved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, report_date)
);

-- Workforce on site per report
CREATE TABLE sdr_workforce (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  trade VARCHAR(100) NOT NULL,            -- mason, carpenter, electrician, labourer
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  planned_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment on site per report
CREATE TABLE sdr_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  equipment_name VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  hours_used DECIMAL(6,2) DEFAULT 0,
  idle_hours DECIMAL(6,2) DEFAULT 0,
  operator_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work activities performed per report
CREATE TABLE sdr_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location_on_site VARCHAR(255),
  unit VARCHAR(50),
  quantity_done DECIMAL(15,3) DEFAULT 0,
  cumulative_quantity DECIMAL(15,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues and observations per report
CREATE TABLE sdr_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  issue_type VARCHAR(50),                 -- safety, quality, delay, rfi, instruction
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  raised_by VARCHAR(100),
  status VARCHAR(30) DEFAULT 'open',     -- open, in_progress, resolved, closed
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships
- `site_daily_reports` → `projects` (many-to-one, CASCADE)
- `sdr_workforce` → `site_daily_reports` (many-to-one, CASCADE)
- `sdr_workforce` → `contractors` (many-to-one, SET NULL)
- `sdr_equipment` → `site_daily_reports` (many-to-one, CASCADE)
- `sdr_activities` → `site_daily_reports` (many-to-one, CASCADE)
- `sdr_activities` → `boq_items` (many-to-one, SET NULL — links progress to BOQ)
- `sdr_issues` → `site_daily_reports` (many-to-one, CASCADE)

### APIs / Server Actions
- `createDailyReport(projectId, date)` — create report shell
- `updateReport(id, data)` — update header fields
- `submitReport(id)` — change status to submitted
- `approveReport(id)` — change status to approved
- `addWorkforce(reportId, data)` / `removeWorkforce(id)`
- `addEquipment(reportId, data)` / `removeEquipment(id)`
- `addActivity(reportId, data)` / `removeActivity(id)`
- `addIssue(reportId, data)` / `updateIssue(id, data)`
- `getReportsByProject(projectId, dateRange)` — list with pagination
- `getProgressSummary(projectId, boqItemId)` — cumulative done vs BOQ qty

### UI Pages
- `/projects/[id]/reports` — calendar view of report status + list
- `/projects/[id]/reports/new` — create today's report
- `/projects/[id]/reports/[reportId]` — full report detail with tabs (Workforce / Equipment / Activities / Issues)
- `/projects/[id]/reports/[reportId]/edit` — edit mode

### Complexity: **Medium**
Standard CRUD with multi-section forms. Calendar view is slightly complex.

---

## Module 2 — Concrete Management

### Purpose
Track concrete pours: mix design, volumes, pour locations, cube test results, and QC compliance.

### Database Tables

```sql
-- Concrete mix designs used on project
CREATE TABLE concrete_mix_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  mix_code VARCHAR(50) NOT NULL,          -- e.g. C25/30, C30/37
  grade VARCHAR(50),                      -- characteristic strength
  cement_type VARCHAR(100),
  w_c_ratio DECIMAL(4,3),
  slump_range VARCHAR(50),
  aggregate_size VARCHAR(50),
  admixtures TEXT,
  design_strength DECIMAL(8,2),
  supplier VARCHAR(255),
  approved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual concrete pours
CREATE TABLE concrete_pours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  mix_design_id UUID REFERENCES concrete_mix_designs(id) ON DELETE SET NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  pour_date DATE NOT NULL,
  pour_reference VARCHAR(100),            -- e.g. POUR-001
  location_description TEXT NOT NULL,     -- element poured: Column C2 Level 3
  structural_element VARCHAR(100),        -- column, beam, slab, wall, footing
  volume_ordered DECIMAL(10,3),
  volume_placed DECIMAL(10,3),
  plant_name VARCHAR(255),
  delivery_note_numbers TEXT,
  start_time TIME,
  finish_time TIME,
  ambient_temp DECIMAL(5,1),
  concrete_temp DECIMAL(5,1),
  slump_measured DECIMAL(6,1),
  air_content DECIMAL(5,2),
  supervisor VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cube/cylinder test samples
CREATE TABLE concrete_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pour_id UUID REFERENCES concrete_pours(id) ON DELETE CASCADE NOT NULL,
  sample_reference VARCHAR(100) NOT NULL,
  sample_type VARCHAR(20) DEFAULT 'cube', -- cube, cylinder
  mould_size VARCHAR(50),
  taken_by VARCHAR(100),
  curing_method VARCHAR(100),
  test_age_days INTEGER,
  test_date DATE,
  test_lab VARCHAR(255),
  load_at_failure DECIMAL(10,2),
  cross_section_area DECIMAL(10,4),
  compressive_strength DECIMAL(8,2),     -- MPa / N/mm²
  required_strength DECIMAL(8,2),
  result VARCHAR(20),                    -- pass, fail, pending
  certificate_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships
- `concrete_mix_designs` → `projects`
- `concrete_pours` → `projects`, `concrete_mix_designs`, `boq_items`
- `concrete_samples` → `concrete_pours` (CASCADE)

### APIs / Server Actions
- `createMixDesign` / `updateMixDesign` / `deleteMixDesign`
- `createPour` / `updatePour` / `deletePour`
- `addSample` / `updateSample` — record test results
- `getPoursByProject(projectId)` — with aggregate volumes
- `getTestResults(projectId)` — pass/fail summary by mix

### UI Pages
- `/projects/[id]/concrete` — pour log + volume totals + pass/fail dashboard
- `/projects/[id]/concrete/mix-designs` — mix design register
- `/projects/[id]/concrete/pours/[pourId]` — pour detail with samples table

### Complexity: **Medium**

---

## Module 3 — Steel Management

### Purpose
Track reinforcement steel: deliveries, bar bending schedules, placement, and wastage.

### Database Tables

```sql
-- Steel deliveries to site
CREATE TABLE steel_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  delivery_date DATE NOT NULL,
  supplier VARCHAR(255),
  delivery_note VARCHAR(100),
  heat_number VARCHAR(100),               -- mill certificate reference
  grade VARCHAR(50),                      -- B500B, Grade 60, etc.
  diameter_mm DECIMAL(6,2) NOT NULL,
  length_m DECIMAL(8,3),
  quantity_bars INTEGER,
  weight_kg DECIMAL(12,3),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(15,2),
  mill_cert_received BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bar bending schedule items
CREATE TABLE steel_bar_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  element_mark VARCHAR(50) NOT NULL,      -- B1, C2, S3-A
  structural_element VARCHAR(100),
  bar_mark VARCHAR(20),
  diameter_mm DECIMAL(6,2) NOT NULL,
  shape_code VARCHAR(20),
  total_length_mm DECIMAL(10,2),
  quantity_bars INTEGER,
  weight_per_bar_kg DECIMAL(10,4),
  total_weight_kg DECIMAL(12,3),
  location_description TEXT,
  status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, cut, placed, inspected
  placed_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Steel wastage / off-cuts log
CREATE TABLE steel_wastage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  diameter_mm DECIMAL(6,2) NOT NULL,
  weight_kg DECIMAL(12,3),
  reason VARCHAR(255),                    -- cutting waste, damaged, wrong cut
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships
- `steel_deliveries` → `projects`
- `steel_bar_schedule` → `projects`, `boq_items`
- `steel_wastage` → `projects`

### APIs / Server Actions
- `createDelivery` / `updateDelivery` — log incoming steel
- `createBarScheduleItem` / `updateStatus` — track bending & placement
- `logWastage` — record off-cut/waste
- `getSteelBalance(projectId)` — delivered vs placed vs wastage
- `getDeliveriesByProject(projectId, dateRange)`

### UI Pages
- `/projects/[id]/steel` — summary: delivered, placed, wastage balance
- `/projects/[id]/steel/deliveries` — delivery log
- `/projects/[id]/steel/schedule` — bar bending schedule table
- `/projects/[id]/steel/wastage` — wastage log

### Complexity: **Medium**

---

## Module 4 — Cash Flow Management

### Purpose
Project-level and portfolio-level cash flow: S-curves, income vs expenditure, payment certificates, cash position forecasting.

### Database Tables

```sql
-- Payment certificates (valuations)
CREATE TABLE payment_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  certificate_number INTEGER NOT NULL,
  valuation_date DATE NOT NULL,
  period_from DATE,
  period_to DATE,
  gross_value DECIMAL(15,2) DEFAULT 0,
  retention_percent DECIMAL(5,2) DEFAULT 5.0,
  retention_amount DECIMAL(15,2) DEFAULT 0,
  net_certified DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  paid_date DATE,
  status VARCHAR(30) DEFAULT 'draft',    -- draft, submitted, certified, paid
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Line items in a certificate
CREATE TABLE payment_certificate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID REFERENCES payment_certificates(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  boq_quantity DECIMAL(15,3),
  boq_rate DECIMAL(15,2),
  boq_amount DECIMAL(15,2),
  prev_quantity DECIMAL(15,3) DEFAULT 0,
  this_period_quantity DECIMAL(15,3) DEFAULT 0,
  cumulative_quantity DECIMAL(15,3) DEFAULT 0,
  percent_complete DECIMAL(5,2) DEFAULT 0,
  certified_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash flow forecast periods
CREATE TABLE cashflow_forecast (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  period_date DATE NOT NULL,              -- first day of month/period
  period_label VARCHAR(50),
  planned_income DECIMAL(15,2) DEFAULT 0,
  planned_expenditure DECIMAL(15,2) DEFAULT 0,
  actual_income DECIMAL(15,2) DEFAULT 0,
  actual_expenditure DECIMAL(15,2) DEFAULT 0,
  cumulative_planned_income DECIMAL(15,2),
  cumulative_actual_income DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, period_date)
);
```

### APIs / Server Actions
- `createCertificate` / `submitCertificate` / `certifyPayment` / `markPaid`
- `addCertificateItem` / `updateCertificateItem`
- `updateForecastPeriod(projectId, periodDate, data)`
- `getCashFlowData(projectId)` — planned vs actual for S-curve
- `getRetentionBalance(projectId)` — cumulative retention held
- `getCertificateSummary(projectId)` — all certificates with status

### UI Pages
- `/projects/[id]/cashflow` — S-curve chart + period table
- `/projects/[id]/cashflow/certificates` — certificate list
- `/projects/[id]/cashflow/certificates/[certId]` — certificate detail with line items
- `/projects/[id]/cashflow/forecast` — editable forecast grid

### Complexity: **High** (S-curve chart, certificate logic, running totals)

---

## Module 5 — Quantity Takeoff System

### Purpose
Digital measurement of project quantities from drawings: room/element-based takeoff linked directly to BOQ items.

### Database Tables

```sql
-- Takeoff workbooks per project
CREATE TABLE takeoff_workbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  drawing_reference VARCHAR(100),
  revision VARCHAR(20),
  scale VARCHAR(50),
  description TEXT,
  status VARCHAR(30) DEFAULT 'draft',    -- draft, complete, approved
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups/rooms within a takeoff workbook
CREATE TABLE takeoff_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workbook_id UUID REFERENCES takeoff_workbooks(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,             -- Room 101, Level 2, Roof, etc.
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual measurement lines
CREATE TABLE takeoff_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES takeoff_groups(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  formula TEXT,                           -- stored formula string e.g. "3.5 * 2.4 * 2"
  dimension_a DECIMAL(15,4),             -- length / count
  dimension_b DECIMAL(15,4),             -- width
  dimension_c DECIMAL(15,4),             -- height / depth
  multiplier DECIMAL(10,3) DEFAULT 1,    -- nr of repetitions
  deduct BOOLEAN DEFAULT false,          -- subtraction (openings etc.)
  quantity DECIMAL(15,4),                -- computed result
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships
- `takeoff_workbooks` → `projects`
- `takeoff_groups` → `takeoff_workbooks`
- `takeoff_items` → `takeoff_groups`, `boq_items` (pushes computed qty to BOQ)

### APIs / Server Actions
- `createWorkbook` / `updateWorkbook` / `deleteWorkbook`
- `addGroup` / `renameGroup` / `deleteGroup`
- `addItem` / `updateItem` / `deleteItem`
- `computeQuantity(formula, a, b, c, multiplier, deduct)` — formula parser
- `pushToBOQ(workbookId)` — aggregate items → update boq_items quantities
- `getWorkbookSummary(workbookId)` — totals by BOQ item

### UI Pages
- `/projects/[id]/takeoff` — workbook list
- `/projects/[id]/takeoff/[workbookId]` — spreadsheet-style takeoff with groups
- `/projects/[id]/takeoff/[workbookId]/summary` — BOQ reconciliation

### Complexity: **High** (spreadsheet-like inline editing, formula computation)

---

## Module 6 — BOQ Automation

### Purpose
Generate BOQ items automatically from takeoff results; import from Excel; apply rate libraries.

### Database Tables

```sql
-- Rate library (master price book)
CREATE TABLE rate_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_code VARCHAR(100),
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  base_rate DECIMAL(15,2) NOT NULL,
  trade_category VARCHAR(100),
  region VARCHAR(100),
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOQ import jobs
CREATE TABLE boq_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  source VARCHAR(50),                    -- excel, csv, takeoff
  filename VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pending',  -- pending, processing, complete, failed
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### Complexity: **High** (Excel parsing with xlsx library, rate matching)

---

## Module 7 — PDF Plan Measurement

### Purpose
Upload PDF construction drawings, calibrate scale, and measure lengths/areas/counts directly on the drawing canvas.

### Database Tables

```sql
-- Uploaded drawing files
CREATE TABLE drawing_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,            -- Supabase Storage path
  file_size_bytes BIGINT,
  page_count INTEGER,
  status VARCHAR(30) DEFAULT 'processing', -- processing, ready, error
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scale calibrations per page
CREATE TABLE drawing_calibrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drawing_id UUID REFERENCES drawing_files(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER DEFAULT 1,
  known_distance_px DECIMAL(12,4),       -- pixel distance of calibration line
  known_distance_real DECIMAL(12,4),     -- real-world distance
  real_unit VARCHAR(20) DEFAULT 'm',
  scale_ratio DECIMAL(12,6),             -- px per meter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Measurements made on drawings
CREATE TABLE drawing_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drawing_id UUID REFERENCES drawing_files(id) ON DELETE CASCADE NOT NULL,
  takeoff_item_id UUID REFERENCES takeoff_items(id) ON DELETE SET NULL,
  page_number INTEGER DEFAULT 1,
  measurement_type VARCHAR(20),          -- length, area, count, perimeter
  path_data JSONB,                       -- array of {x,y} points
  raw_value DECIMAL(15,4),              -- in pixels
  real_value DECIMAL(15,4),             -- in real units after calibration
  unit VARCHAR(20),
  label TEXT,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Dependencies
- Supabase Storage (PDF file upload)
- PDF.js (client-side PDF rendering)
- Canvas API (measurement overlay)

### Complexity: **Very High** (PDF rendering, canvas hit-testing, scale calibration)

---

## Module 8 — Student Portal

### Purpose
Educational module: quantity surveying study materials, worked examples, formula references, and practice exercises.

### Database Tables

```sql
-- Course/topic structure
CREATE TABLE study_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES study_topics(id),  -- for sub-topics
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles / study notes
CREATE TABLE study_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES study_topics(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  content TEXT NOT NULL,                 -- Markdown content
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice exercises / questions
CREATE TABLE study_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES study_topics(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES study_articles(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, article_id)
);
```

### UI Pages
- `/learn` — topic listing
- `/learn/[slug]` — topic with articles
- `/learn/[slug]/[article]` — article content
- `/learn/exercises` — practice questions

### Complexity: **Medium**

---

## Module 9 — AI Quantity Surveyor Assistant

### Purpose
Claude-powered assistant embedded throughout the app: answer QS questions, review BOQ items, suggest rates, analyze cost overruns, draft variation orders.

### Database Tables

```sql
-- Conversation history
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255),
  context_type VARCHAR(50),              -- general, boq_review, cost_analysis, site_report
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL,             -- user, assistant
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Routes
- `POST /api/ai/chat` — streaming chat endpoint (Anthropic SDK)
- `POST /api/ai/analyze-boq` — BOQ review against rate library
- `POST /api/ai/cost-analysis` — summarize cost overruns for a project

### Dependencies
- `@anthropic-ai/sdk` package
- Supabase `ai_conversations` + `ai_messages` for history
- Context injection: project BOQ, cost summary, site reports fed into system prompt

### Complexity: **Very High** (streaming UI, context assembly, tool use)

---

## Full Database ERD (Phase 2)

```
auth.users
  ├── projects (user_id)
  │     ├── boq_items (project_id)
  │     │     ├── takeoff_items (boq_item_id)
  │     │     ├── sdr_activities (boq_item_id)
  │     │     ├── cost_entries (boq_item_id)
  │     │     ├── concrete_pours (boq_item_id)
  │     │     └── steel_bar_schedule (boq_item_id)
  │     ├── cost_entries (project_id)
  │     ├── contractor_payments (project_id)
  │     ├── site_daily_reports (project_id)
  │     │     ├── sdr_workforce (report_id)
  │     │     ├── sdr_equipment (report_id)
  │     │     ├── sdr_activities (report_id)
  │     │     └── sdr_issues (report_id)
  │     ├── concrete_mix_designs (project_id)
  │     ├── concrete_pours (project_id)
  │     │     └── concrete_samples (pour_id)
  │     ├── steel_deliveries (project_id)
  │     ├── steel_bar_schedule (project_id)
  │     ├── steel_wastage (project_id)
  │     ├── payment_certificates (project_id)
  │     │     └── payment_certificate_items (certificate_id)
  │     ├── cashflow_forecast (project_id)
  │     ├── takeoff_workbooks (project_id)
  │     │     └── takeoff_groups (workbook_id)
  │     │           └── takeoff_items (group_id)
  │     └── drawing_files (project_id)
  │           ├── drawing_calibrations (drawing_id)
  │           └── drawing_measurements (drawing_id)
  ├── contractors (user_id)
  ├── rate_library (user_id)
  └── ai_conversations (user_id)
        └── ai_messages (conversation_id)

study_topics (standalone)
  └── study_articles (topic_id)
  └── study_exercises (topic_id)
student_progress (user_id, article_id)
```

---

## Recommended Implementation Order

### Sprint 1 (Now) — Site Daily Reports
Highest immediate value for site engineers. Standard CRUD, familiar patterns, no external dependencies.

### Sprint 2 — Concrete + Steel Management
Materials tracking. Builds on SDR patterns. Adds cube test QC.

### Sprint 3 — Cash Flow Management
S-curve + payment certificates. High financial value. Needs recharts for visualization.

### Sprint 4 — Quantity Takeoff
Core QS workflow. Spreadsheet-like UI. Feeds BOQ automation.

### Sprint 5 — BOQ Automation + Rate Library
Completes the takeoff → BOQ pipeline.

### Sprint 6 — PDF Plan Measurement
Complex canvas + PDF.js. Builds on takeoff.

### Sprint 7 — Student Portal
Standalone, lower risk, good for growth.

### Sprint 8 — AI Quantity Surveyor
Capstone feature. Integrates all modules via Anthropic API.
