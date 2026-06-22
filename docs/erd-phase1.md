# ANGEL D.C. — Rebuild Phase 1 — Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                     │
│  (Supabase managed — id, email, etc.)                                       │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ 1
                           │
                           ▼ N
┌──────────────────────────────────────────────────────────────────────────────┐
│                          qb_projects                                         │
│──────────────────────────────────────────────────────────────────────────────│
│  id            UUID PK                                                       │
│  user_id       UUID FK → auth.users(id) ON DELETE CASCADE                    │
│  name          TEXT NOT NULL                                                 │
│  client_name   TEXT                                                          │
│  location      TEXT                                                          │
│  currency      VARCHAR(10) DEFAULT 'USD'                                     │
│  vat_pct       NUMERIC(5,2) DEFAULT 0                                        │
│  notes         TEXT                                                          │
│  created_at    TIMESTAMPTZ                                                   │
│  updated_at    TIMESTAMPTZ                                                   │
└──────┬───────────────────┬───────────────────────────────────────────────────┘
       │ 1                 │ 1
       │                   │
       ▼ N                 ▼ N
┌──────────────────┐  ┌───────────────────────────────────────────────────────┐
│  qb_drawings     │  │  qb_measurement_items                                 │
│──────────────────│  │───────────────────────────────────────────────────────│
│  id         UUID │  │  id              UUID PK                               │
│  project_id UUID │  │  project_id      UUID FK → qb_projects                 │
│  user_id    UUID │  │  item_code       VARCHAR(50)                           │
│  name       TEXT │  │  description     TEXT NOT NULL                         │
│  drawing_type    │  │  unit            VARCHAR(30) DEFAULT 'm'               │
│  revision   TEXT │  │  section         TEXT                                  │
│  file_path  TEXT │  │  drawing_ref     TEXT                                  │
│  file_type  TEXT │  │  location        TEXT                                  │
│  file_size  INT8 │  │  sort_order      INT                                  │
│  page_count INT  │  │  additions_qty   NUMERIC DEFAULT 0                    │
│  created_at      │  │  deductions_qty  NUMERIC DEFAULT 0                    │
│  updated_at      │  │  net_qty         NUMERIC DEFAULT 0                    │
└──────┬───────────┘  │  created_at      TIMESTAMPTZ                          │
       │ 1            │  updated_at      TIMESTAMPTZ                          │
       │              └──────┬────────────────────────────────────────────────┘
       │                     │ 1
       ▼ N                   │
┌──────────────────────┐     ▼ N
│ qb_drawing_scales    │  ┌──────────────────────────────────────────────────┐
│──────────────────────│  │  qb_measurement_lines                            │
│  id          UUID PK │  │──────────────────────────────────────────────────│
│  drawing_id  UUID FK │  │  id              UUID PK                         │
│  page_number INT     │  │  item_id         UUID FK → qb_measurement_items  │
│  pt1_x   NUMERIC     │  │  line_number     INT                             │
│  pt1_y   NUMERIC     │  │  description     TEXT                            │
│  pt2_x   NUMERIC     │  │  location        TEXT                            │
│  pt2_y   NUMERIC     │  │  nr              NUMERIC DEFAULT 1  (count/N)    │
│  real_length NUMERIC │  │  length          NUMERIC                         │
│  unit    VARCHAR(20) │  │  width           NUMERIC                         │
│  px_per_unit NUMERIC │  │  height          NUMERIC                         │
│  created_at          │  │  formula         TEXT                            │
│  UNIQUE(drawing,pg)  │  │  is_deduction    BOOL DEFAULT false              │
└──────────────────────┘  │  quantity        NUMERIC DEFAULT 0               │
       │                  │  notes           TEXT                            │
       │                  │  drawing_id      UUID FK → qb_drawings (nullable)│
       │                  │  page_number     INT                             │
       │                  │  geo_json        JSONB (points on drawing)       │
       │                  │  scale_id        UUID FK → qb_drawing_scales     │
       │                  │  sort_order      INT                             │
       │                  │  created_at      TIMESTAMPTZ                     │
       │                  │  updated_at      TIMESTAMPTZ                     │
       │                  └──────────────────────────────────────────────────┘
       │
       │                          ┌──────────────────────────────────────────┐
       │                          │  qb_boq_items                            │
       │                          │──────────────────────────────────────────│
       │                          │  id              UUID PK                 │
       │                          │  project_id      UUID FK → qb_projects   │
       │                          │  mi_id           UUID FK → qb_meas_items │
       │                          │  code            VARCHAR(50)             │
       │                          │  description     TEXT NOT NULL           │
       │                          │  unit            VARCHAR(30)             │
       │                          │  quantity        NUMERIC DEFAULT 0       │
       │                          │  unit_rate       NUMERIC(15,4) DEFAULT 0 │
       │                          │  material_rate   NUMERIC(15,4)           │
       │                          │  labor_rate      NUMERIC(15,4)           │
       │                          │  equipment_rate  NUMERIC(15,4)           │
       │                          │  total_amount    NUMERIC(15,4)  (computed)│
       │                          │  section         TEXT                    │
       │                          │  notes           TEXT                    │
       │                          │  sort_order      INT                     │
       │                          │  created_at      TIMESTAMPTZ             │
       │                          │  updated_at      TIMESTAMPTZ             │
       │                          └──────────────────────────────────────────┘
       │
       │
       │
┌──────────────────────────────────────────────────────────────────────────────┐
│                          qb_pricing_library                                  │
│──────────────────────────────────────────────────────────────────────────────│
│  id              UUID PK                                                     │
│  user_id         UUID FK → auth.users(id)                                    │
│  code            VARCHAR(50)                                                 │
│  category        TEXT                                                        │
│  description     TEXT NOT NULL                                               │
│  unit            VARCHAR(30)                                                 │
│  default_rate    NUMERIC(15,4) DEFAULT 0                                     │
│  material_rate   NUMERIC(15,4)                                               │
│  labor_rate      NUMERIC(15,4)                                               │
│  equipment_rate  NUMERIC(15,4)                                               │
│  notes           TEXT                                                        │
│  created_at      TIMESTAMPTZ                                                 │
│  updated_at      TIMESTAMPTZ                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────────────────────────────
DATA FLOW
────────────────────────────────────────────────────────────────────────────────

  Drawing + Scale  ───►  Measurement Lines (N × L × W × H or formula)
                                │
                                │  grouped by
                                ▼
                         Measurement Items  ───►  net_qty (auto-sum via trigger)
                                │
                                │  linked via mi_id
                                ▼
                           BOQ Items  ───►  quantity = mi.net_qty (live)
                                │
                                │  × unit_rate
                                ▼
                         total_amount  ───►  Section totals / Project total / +VAT

  Pricing Library  ───►  user picks rate  ───►  BOQ Item unit_rate
────────────────────────────────────────────────────────────────────────────────

PREFIX: All new tables use "qb_" (quantity book) to avoid collisions with
existing production tables (projects, boq_items, drawing_files, etc.)
────────────────────────────────────────────────────────────────────────────────
```
