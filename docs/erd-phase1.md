# ANGEL D.C. — Phase 1 — Entity Relationship Diagram

## Tables (8 tables, all prefixed `qb_`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                  │
│  (Supabase-managed — id, email)                                          │
└────────────┬─────────────────────────────────────────┬───────────────────┘
             │ 1                                       │ 1
             │                                         │
             ▼ N                                       ▼ N
┌────────────────────────────┐          ┌──────────────────────────────────┐
│       qb_projects          │          │    qb_library_categories         │
│────────────────────────────│          │──────────────────────────────────│
│  id          UUID PK       │          │  id          UUID PK             │
│  user_id     UUID FK→users │          │  user_id     UUID FK→users       │
│  name        TEXT NOT NULL │          │  name        TEXT NOT NULL        │
│  client_name TEXT           │          │  description TEXT                │
│  location    TEXT           │          │  sort_order  INT                 │
│  currency    VARCHAR(10)   │          │  created_at  TIMESTAMPTZ         │
│  vat_pct     NUMERIC(5,2)  │          │  updated_at  TIMESTAMPTZ         │
│  notes       TEXT           │          └──────────────┬───────────────────┘
│  created_at  TIMESTAMPTZ   │                         │ 1
│  updated_at  TIMESTAMPTZ   │                         │
└────┬──────────┬────────────┘                         ▼ N
     │ 1        │ 1                     ┌──────────────────────────────────┐
     │          │                       │      qb_library_items            │
     │          │                       │──────────────────────────────────│
     ▼ N        │                       │  id              UUID PK         │
┌───────────────────────┐               │  category_id     UUID FK→cat     │
│     qb_drawings       │               │  user_id         UUID FK→users   │
│───────────────────────│               │  code            VARCHAR(50)     │
│  id          UUID PK  │               │  description     TEXT NOT NULL   │
│  project_id  UUID FK  │               │  unit            VARCHAR(30)     │
│  user_id     UUID FK  │               │  default_rate    NUMERIC(15,4)   │
│  name        TEXT     │               │  material_rate   NUMERIC(15,4)   │
│  drawing_type TEXT    │               │  labor_rate      NUMERIC(15,4)   │
│  revision    TEXT     │               │  equipment_rate  NUMERIC(15,4)   │
│  file_path   TEXT     │               │  notes           TEXT             │
│  file_type   TEXT     │               │  sort_order      INT             │
│  file_size   BIGINT   │               │  created_at      TIMESTAMPTZ     │
│  page_count  INT      │               │  updated_at      TIMESTAMPTZ     │
│  created_at           │               └──────────────────────────────────┘
│  updated_at           │                              │
└───────┬───────────────┘                              │  library_item_id
        │ 1                                            │  (optional FK)
        │                                              │
        ▼ N                                            │
┌───────────────────────┐                              │
│  qb_drawing_scales    │                              │
│───────────────────────│                              │
│  id          UUID PK  │                              │
│  drawing_id  UUID FK  │                              │
│  page_number INT      │                              │
│  pt1_x    NUMERIC     │                              │
│  pt1_y    NUMERIC     │                              │
│  pt2_x    NUMERIC     │                              │
│  pt2_y    NUMERIC     │                              │
│  real_length NUMERIC  │                              │
│  unit     VARCHAR(20) │                              │
│  px_per_unit NUMERIC  │                              │
│  UNIQUE(drawing,page) │                              │
└───────────────────────┘                              │
                                                       │
     ┌─────────────────────────────────────────────────┘
     │
     │   PROJECT ──► MEASUREMENT ITEMS ──► MEASUREMENT LINES ──► BOQ
     │
     ▼ N
┌─────────────────────────────────────────────────────────────────────────┐
│                      qb_measurement_items                               │
│─────────────────────────────────────────────────────────────────────────│
│  id               UUID PK                                               │
│  project_id       UUID FK → qb_projects                                 │
│  item_code        VARCHAR(50)                                           │
│  description      TEXT NOT NULL                                         │
│  unit             VARCHAR(30) DEFAULT 'm'                               │
│  measurement_type qb_measurement_type ENUM                              │
│                   ('length','area','volume','count','weight','formula')  │
│  section          TEXT                                                   │
│  drawing_ref      TEXT                                                   │
│  location         TEXT                                                   │
│  sort_order       INT                                                   │
│  additions_qty    NUMERIC  ← trigger-maintained                         │
│  deductions_qty   NUMERIC  ← trigger-maintained                         │
│  net_qty          NUMERIC  ← trigger-maintained                         │
│  created_at       TIMESTAMPTZ                                           │
│  updated_at       TIMESTAMPTZ                                           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ 1
                             │
                             ▼ N
┌─────────────────────────────────────────────────────────────────────────┐
│                      qb_measurement_lines                               │
│─────────────────────────────────────────────────────────────────────────│
│  id              UUID PK                                                │
│  item_id         UUID FK → qb_measurement_items (CASCADE)               │
│  line_number     INT                                                    │
│  description     TEXT                                                   │
│  location        TEXT                                                   │
│  nr              NUMERIC DEFAULT 1  (count / repetitions)               │
│  length          NUMERIC                                                │
│  width           NUMERIC                                                │
│  height          NUMERIC                                                │
│  formula         TEXT  (overrides dimensions when non-null)             │
│  is_deduction    BOOL DEFAULT false                                     │
│  quantity        NUMERIC  (computed by app, negative if deduction)      │
│  notes           TEXT                                                   │
│  drawing_id      UUID FK → qb_drawings (SET NULL)                       │
│  page_number     INT                                                    │
│  geo_json        JSONB  (coordinates on drawing)                        │
│  scale_id        UUID FK → qb_drawing_scales (SET NULL)                 │
│  sort_order      INT                                                    │
│  created_at      TIMESTAMPTZ                                            │
│  updated_at      TIMESTAMPTZ                                            │
└─────────────────────────────────────────────────────────────────────────┘
                             │ (net_qty pushed via trigger)
                             │
                             ▼ N
┌─────────────────────────────────────────────────────────────────────────┐
│                         qb_boq_items                                    │
│─────────────────────────────────────────────────────────────────────────│
│  id              UUID PK                                                │
│  project_id      UUID FK → qb_projects                                  │
│  mi_id           UUID FK → qb_measurement_items (SET NULL)              │
│  library_item_id UUID FK → qb_library_items (SET NULL)                  │
│  code            VARCHAR(50)                                            │
│  description     TEXT NOT NULL                                          │
│  unit            VARCHAR(30)                                            │
│  quantity        NUMERIC  (auto-synced from mi.net_qty or manual)      │
│  unit_rate       NUMERIC(15,4)                                          │
│  material_rate   NUMERIC(15,4)                                          │
│  labor_rate      NUMERIC(15,4)                                          │
│  equipment_rate  NUMERIC(15,4)                                          │
│  total_amount    NUMERIC(15,4)  GENERATED (quantity × unit_rate)        │
│  section         TEXT                                                   │
│  notes           TEXT                                                   │
│  sort_order      INT                                                    │
│  created_at      TIMESTAMPTZ                                            │
│  updated_at      TIMESTAMPTZ                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Measurement Type Enum — `qb_measurement_type`

```
Type     │ Relevant columns    │ Quantity formula        │ Typical unit
─────────┼─────────────────────┼─────────────────────────┼─────────────
length   │ nr, length          │ nr × length             │ m, lm
area     │ nr, length, width   │ nr × length × width     │ m²
volume   │ nr, length, width,  │ nr × L × W × H          │ m³
         │ height              │                         │
count    │ nr                  │ nr                      │ nr, pcs
weight   │ nr, length, formula │ nr × length × uw        │ kg, ton
         │                     │ (uw parsed from formula)│
formula  │ formula (required)  │ evaluate(formula)       │ any
─────────┼─────────────────────┼─────────────────────────┼─────────────
ANY type │ formula (override)  │ evaluate(formula)       │ any
```

When `formula` is non-null on any measurement_type, it **overrides** the dimensional
calculation. This lets users enter expressions like `4.85 + 1.68 + 2.03` or
`36.32 * 0.2 * -1` on any row regardless of type.

## Data Flow

```
 Drawing + Scale  ───►  Measurement Lines  (dimensions or formula)
                               │
                               │  grouped by item_id
                               ▼
                        Measurement Items   ───►  net_qty (trigger-maintained)
                               │
                               │  linked via mi_id
                               ▼
                          BOQ Items          ───►  quantity = mi.net_qty (trigger)
                               │                        × unit_rate
                               │                        ────────────
                               ▼                        total_amount (generated)
                         Section totals
                         Project total
                         + VAT%
                         ──────────
                         Grand total

 Library Categories
       └── Library Items ───►  BOQ Item  (rate + breakdown)
```

## Library Hierarchy

```
 qb_library_categories          qb_library_items
 ┌──────────────────┐          ┌────────────────────────┐
 │ Concrete Works   │──1:N───►│ Plain concrete C20     │
 │                  │          │ Reinforced concrete C30│
 │                  │          │ Formwork - flat        │
 └──────────────────┘          └────────────────────────┘
 ┌──────────────────┐          ┌────────────────────────┐
 │ Earthworks       │──1:N───►│ Bulk excavation        │
 │                  │          │ Trench excavation      │
 │                  │          │ Backfill               │
 └──────────────────┘          └────────────────────────┘
 ┌──────────────────┐          ┌────────────────────────┐
 │ Steelwork        │──1:N───►│ Rebar T12              │
 │                  │          │ Rebar T16              │
 │                  │          │ Structural steel       │
 └──────────────────┘          └────────────────────────┘
```

Each user owns their own categories and items. Items include rate breakdown
(material + labor + equipment) and can be linked to BOQ rows.

## Migrations (run in order)

```
200_qb_projects.sql          →  qb_projects + set_updated_at()
201_qb_drawings.sql          →  qb_drawings + qb_drawing_scales + storage bucket
202_qb_measurement_book.sql  →  qb_measurement_type enum
                                 qb_measurement_items + qb_measurement_lines
                                 qb_recalc_item_totals trigger
203_qb_boq.sql               →  qb_boq_items (GENERATED total_amount)
                                 qb_sync_boq_qty trigger
204_qb_pricing_library.sql   →  qb_library_categories + qb_library_items
205_qb_boq_library_fk.sql    →  FK: boq_items.library_item_id → library_items
```

## RLS Summary

```
Table                    │ Policy pattern
─────────────────────────┼────────────────────────────────────
qb_projects              │ user_id = auth.uid()
qb_drawings              │ user_id = auth.uid()
qb_drawing_scales        │ via qb_drawings.user_id
qb_measurement_items     │ via qb_projects.user_id
qb_measurement_lines     │ via qb_measurement_items → qb_projects.user_id
qb_boq_items             │ via qb_projects.user_id
qb_library_categories    │ user_id = auth.uid()
qb_library_items         │ user_id = auth.uid()
```
