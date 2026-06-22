# ANGEL D.C. — Phase 1.1 — Entity Relationship Diagram

## Tables (10 tables, all prefixed `qb_`)

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
│  drawing_number TEXT  │               │  labor_rate      NUMERIC(15,4)   │
│  drawing_type TEXT    │               │  equipment_rate  NUMERIC(15,4)   │
│  revision_number TEXT │               │                                  │
│  revision_date  DATE  │               │                                  │
│  revision_notes TEXT  │               │                                  │
│  file_path   TEXT     │               │  notes           TEXT             │
│  file_type   TEXT     │               │  sort_order      INT             │
│  file_size   BIGINT   │               │  created_at      TIMESTAMPTZ     │
│  page_count  INT      │               │  updated_at      TIMESTAMPTZ     │
│  created_at           │               └──────────────────────────────────┘
│  updated_at           │                              │
└───┬───────┬───────────┘                              │  library_item_id
    │ 1     │ 1                                        │  (optional FK)
    │       │                                          │
    ▼ N     ▼ N                                        │
┌────────────────────────┐  ┌──────────────────────────────────────────┐
│  qb_drawing_scales     │  │     qb_drawing_measurements              │
│────────────────────────│  │──────────────────────────────────────────│
│  id          UUID PK   │  │  id              UUID PK                 │
│  drawing_id  UUID FK   │  │  drawing_id      UUID FK→drawings        │
│  page_number INT       │  │  page_number     INT                     │
│  label       TEXT      │  │  scale_id        UUID FK→scales (NULL)   │
│  pt1_x    NUMERIC      │  │  tool_type       qb_drawing_tool ENUM    │
│  pt1_y    NUMERIC      │  │  coordinates     JSONB NOT NULL          │
│  pt2_x    NUMERIC      │  │  quantity        NUMERIC                 │
│  pt2_y    NUMERIC      │  │  unit            VARCHAR(20)             │
│  real_length NUMERIC   │  │  label           TEXT                     │
│  unit     VARCHAR(20)  │  │  color           VARCHAR(20)             │
│  px_per_unit NUMERIC   │  │  notes           TEXT                     │
│  created_at            │  │  ocr_source      TEXT                     │
│  (multiple per page)   │  │  ocr_confidence  NUMERIC(5,4)            │
└────────────────────────┘  │  ocr_text        TEXT                     │
                            │  created_at      TIMESTAMPTZ              │
                            │  updated_at      TIMESTAMPTZ              │
                            └──────────────┬───────────────────────────┘
                                           │ drawing_measurement_id
                                           │ (optional FK)
     ┌─────────────────────────────────────┘
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
│  created_by       UUID FK → auth.users (SET NULL)                       │
│  updated_by       UUID FK → auth.users (SET NULL)                       │
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
│  id                      UUID PK                                        │
│  item_id                 UUID FK → qb_measurement_items (CASCADE)       │
│  line_number             INT                                            │
│  description             TEXT                                           │
│  location                TEXT                                           │
│  nr                      NUMERIC DEFAULT 1  (count / repetitions)       │
│  length                  NUMERIC                                        │
│  width                   NUMERIC                                        │
│  height                  NUMERIC                                        │
│  formula                 TEXT  (overrides dimensions when non-null)     │
│  is_deduction            BOOL DEFAULT false                             │
│  quantity                NUMERIC  (computed by app, negative if deduct) │
│  notes                   TEXT                                           │
│  ── Traceability ──────────────────────────────────────────────────     │
│  drawing_measurement_id  UUID FK → qb_drawing_measurements (SET NULL)   │
│  drawing_id              UUID FK → qb_drawings (SET NULL)               │
│  page_number             INT                                            │
│  geo_json                JSONB  (coordinates on drawing)                │
│  scale_id                UUID FK → qb_drawing_scales (SET NULL)         │
│  ── OCR future-proofing ───────────────────────────────────────────    │
│  ocr_source              TEXT                                           │
│  ocr_confidence          NUMERIC(5,4)                                   │
│  ocr_text                TEXT                                           │
│  ──────────────────────────────────────────────────────────────────    │
│  sort_order              INT                                            │
│  created_at              TIMESTAMPTZ                                    │
│  updated_at              TIMESTAMPTZ                                    │
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
│  quantity            NUMERIC  (auto-synced from mi.net_qty or manual)  │
│  original_quantity   NUMERIC                                            │
│  revised_quantity    NUMERIC                                            │
│  quantity_difference NUMERIC  GENERATED (revised - original)            │
│  unit_rate           NUMERIC(15,4)                                      │
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

## Project Currency & VAT

`qb_projects.currency` — VARCHAR(10), default `'USD'`. Common values: NIS, USD, EUR, GBP, or any custom code.

`qb_projects.vat_pct` — NUMERIC(5,2), default `0`. Applied to project grand total.

## Enums

### `qb_measurement_type`

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

### `qb_drawing_tool`

```
Tool       │ Description              │ Coordinates JSONB format
───────────┼──────────────────────────┼─────────────────────────────────────
line       │ Two-point distance       │ { "points": [[x1,y1],[x2,y2]] }
polyline   │ Multi-segment length     │ { "points": [[x1,y1],...,[xN,yN]] }
area       │ Closed polygon area      │ { "points": [[x1,y1],...,[xN,yN]] }
rectangle  │ Axis-aligned rectangle   │ { "origin": [x,y], "width": w, "height": h }
circle     │ Center + radius          │ { "center": [x,y], "radius": r }
count      │ Point markers            │ { "points": [[x1,y1],...] }
```

All coordinates are in PDF/canvas pixel space. Real-world quantity is
computed using the linked scale.

## Traceability Chain

```
 qb_drawings
   └── qb_drawing_scales        (calibration — multiple per page)
   └── qb_drawing_measurements  (takeoff on canvas — tool_type + coordinates)
         └── qb_measurement_lines.drawing_measurement_id
               └── qb_measurement_items  (aggregated net_qty)
                     └── qb_boq_items.mi_id  (priced quantity)

 Every BOQ quantity can be traced:
   BOQ → Measurement Item → Measurement Line → Drawing Measurement → Drawing
```

## Data Flow

```
 Drawing + Scale  ───►  Drawing Measurements  (takeoff with tool)
                               │
                               │  drawing_measurement_id
                               ▼
                        Measurement Lines  (dimensions or formula)
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

## OCR Future-Proofing

Both `qb_drawing_measurements` and `qb_measurement_lines` include nullable OCR fields:

| Column         | Type          | Purpose                              |
|----------------|---------------|--------------------------------------|
| ocr_source     | TEXT          | Engine identifier (e.g. 'tesseract') |
| ocr_confidence | NUMERIC(5,4)  | Confidence score 0.0000 – 1.0000     |
| ocr_text       | TEXT          | Raw OCR output that produced the row |

These are not implemented yet — they exist so OCR-generated measurements
can be stored without a schema migration later.

## Migrations (run in order)

```
200_qb_projects.sql          →  qb_projects + set_updated_at()
201_qb_drawings.sql          →  qb_drawings + qb_drawing_scales (multiple per page)
                                 qb_drawing_tool enum
                                 qb_drawing_measurements (takeoff layer + OCR fields)
                                 Storage bucket qb-drawings
202_qb_measurement_book.sql  →  qb_measurement_type enum
                                 qb_measurement_items + qb_measurement_lines
                                 Traceability FKs (drawing_measurement_id, drawing_id, scale_id)
                                 OCR fields on measurement lines
                                 qb_recalc_item_totals trigger
203_qb_boq.sql               →  qb_boq_items (GENERATED total_amount)
                                 qb_sync_boq_qty trigger
204_qb_pricing_library.sql   →  qb_library_categories + qb_library_items
205_qb_boq_library_fk.sql    →  FK: boq_items.library_item_id → library_items
206_qb_seed_data.sql         →  Demo projects, library, measurements, BOQ
```

## RLS Summary

```
Table                      │ Policy pattern
───────────────────────────┼────────────────────────────────────
qb_projects                │ user_id = auth.uid()
qb_drawings                │ user_id = auth.uid()
qb_drawing_scales          │ via qb_drawings.user_id
qb_drawing_measurements    │ via qb_drawings.user_id
qb_measurement_items       │ via qb_projects.user_id
qb_measurement_lines       │ via qb_measurement_items → qb_projects.user_id
qb_boq_items               │ via qb_projects.user_id
qb_library_categories      │ user_id = auth.uid()
qb_library_items           │ user_id = auth.uid()
```

## Triggers

```
Trigger                    │ Table                  │ Action
───────────────────────────┼────────────────────────┼──────────────────────────────
set_updated_at()           │ All tables             │ BEFORE UPDATE → set updated_at
qb_recalc_item_totals()   │ qb_measurement_lines   │ AFTER INSERT/UPDATE/DELETE →
                           │                        │   recalc additions_qty,
                           │                        │   deductions_qty, net_qty
                           │                        │   on parent measurement item
qb_sync_boq_qty()         │ qb_measurement_items   │ AFTER UPDATE OF net_qty →
                           │                        │   push net_qty to linked
                           │                        │   qb_boq_items rows
```
