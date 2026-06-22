-- ============================================================
-- 202: qb_measurement_items + qb_measurement_lines
-- ============================================================
-- The measurement book: items group lines; lines hold the
-- dimension rows that produce quantities.
--
-- measurement_type controls how quantity is computed:
--   length  → N × Length
--   area    → N × Length × Width
--   volume  → N × Length × Width × Height
--   count   → N  (just a count of items)
--   weight  → N × Length × unit_weight  (stored in formula)
--   formula → evaluate free-text expression
--
-- When measurement_type = 'formula', the "formula" column is
-- evaluated as a math expression by the app layer. For all
-- other types the app computes from the dimension columns.
-- A non-null formula on ANY type overrides dimensional calc.
-- A DB trigger keeps item totals in sync.
-- ============================================================

-- ── Measurement type enum ───────────────────────────────────

CREATE TYPE qb_measurement_type AS ENUM (
  'length',    -- N × L                → m, lm
  'area',      -- N × L × W            → m²
  'volume',    -- N × L × W × H        → m³
  'count',     -- N                     → nr, pcs
  'weight',    -- N × L × unit_weight   → kg, ton
  'formula'    -- free-text expression  → any unit
);

-- ── Measurement items ───────────────────────────────────────

CREATE TABLE qb_measurement_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  item_code       VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
  measurement_type qb_measurement_type NOT NULL DEFAULT 'volume',
  section         TEXT,          -- grouping: Substructure, Superstructure …
  drawing_ref     TEXT,          -- e.g. "S-01, S-02"
  location        TEXT,          -- e.g. "Ground Floor"
  sort_order      INT NOT NULL DEFAULT 0,
  -- Aggregates (maintained by trigger on qb_measurement_lines)
  additions_qty   NUMERIC NOT NULL DEFAULT 0,
  deductions_qty  NUMERIC NOT NULL DEFAULT 0,
  net_qty         NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_mi_project   ON qb_measurement_items(project_id);
CREATE INDEX idx_qb_mi_section   ON qb_measurement_items(section);
CREATE INDEX idx_qb_mi_type      ON qb_measurement_items(measurement_type);

ALTER TABLE qb_measurement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_project_owner" ON qb_measurement_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

CREATE TRIGGER trg_qb_mi_updated
  BEFORE UPDATE ON qb_measurement_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Measurement lines ───────────────────────────────────────

CREATE TABLE qb_measurement_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES qb_measurement_items(id) ON DELETE CASCADE,
  line_number     INT NOT NULL DEFAULT 1,
  description     TEXT,
  location        TEXT,

  -- Dimensions (which columns matter depends on parent item's measurement_type)
  nr              NUMERIC NOT NULL DEFAULT 1,    -- count / repetitions
  length          NUMERIC,
  width           NUMERIC,
  height          NUMERIC,

  -- Free-form formula — used when parent measurement_type = 'formula',
  -- OR as override for any type (app evaluates this first when non-null)
  formula         TEXT,

  -- Addition vs deduction
  is_deduction    BOOLEAN NOT NULL DEFAULT false,
  -- Computed quantity (set by app; negative when is_deduction = true)
  quantity        NUMERIC NOT NULL DEFAULT 0,

  notes           TEXT,

  -- ── Traceability: link to drawing measurement ─────────────
  -- Full chain: drawing → drawing_measurement → measurement_line → item → BOQ
  drawing_measurement_id UUID REFERENCES qb_drawing_measurements(id) ON DELETE SET NULL,
  drawing_id      UUID REFERENCES qb_drawings(id) ON DELETE SET NULL,
  page_number     INT,
  geo_json        JSONB,        -- polyline / polygon points on the drawing
  scale_id        UUID REFERENCES qb_drawing_scales(id) ON DELETE SET NULL,

  -- ── OCR future-proofing ───────────────────────────────────
  ocr_source      TEXT,            -- e.g. 'tesseract', 'google-vision'
  ocr_confidence  NUMERIC(5,4),    -- 0.0000 – 1.0000
  ocr_text        TEXT,            -- raw OCR output that generated this line

  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_ml_item    ON qb_measurement_lines(item_id);
CREATE INDEX idx_qb_ml_drawing ON qb_measurement_lines(drawing_id);
CREATE INDEX idx_qb_ml_dm      ON qb_measurement_lines(drawing_measurement_id);

ALTER TABLE qb_measurement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_item_owner" ON qb_measurement_lines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN qb_projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN qb_projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.user_id = auth.uid()
  ));

CREATE TRIGGER trg_qb_ml_updated
  BEFORE UPDATE ON qb_measurement_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: recalculate item totals after line changes ─────

CREATE OR REPLACE FUNCTION public.qb_recalc_item_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.item_id, OLD.item_id);

  UPDATE qb_measurement_items SET
    additions_qty  = COALESCE((
      SELECT SUM(quantity)
      FROM qb_measurement_lines
      WHERE item_id = target AND NOT is_deduction
    ), 0),
    deductions_qty = COALESCE((
      SELECT SUM(ABS(quantity))
      FROM qb_measurement_lines
      WHERE item_id = target AND is_deduction
    ), 0),
    net_qty = COALESCE((
      SELECT SUM(quantity)
      FROM qb_measurement_lines
      WHERE item_id = target
    ), 0)
  WHERE id = target;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_qb_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON qb_measurement_lines
  FOR EACH ROW EXECUTE FUNCTION public.qb_recalc_item_totals();

-- ============================================================
-- QUANTITY CALCULATION RULES (enforced in application layer)
-- ============================================================
--
-- measurement_type │ formula col │ calculation
-- ─────────────────┼─────────────┼───────────────────────────
-- length           │ NULL        │ nr × length
-- area             │ NULL        │ nr × length × width
-- volume           │ NULL        │ nr × length × width × height
-- count            │ NULL        │ nr
-- weight           │ NULL        │ nr × length × (unit_weight in formula)
-- formula          │ required    │ evaluate(formula)
-- ANY type         │ non-NULL    │ evaluate(formula)  ← override
--
-- is_deduction = true  →  quantity stored as negative
-- ============================================================

-- ============================================================
-- TRACEABILITY CHAIN
-- ============================================================
--
--  qb_drawings
--    └── qb_drawing_scales        (calibration)
--    └── qb_drawing_measurements  (takeoff on canvas)
--          └── qb_measurement_lines.drawing_measurement_id
--                └── qb_measurement_items  (aggregated net_qty)
--                      └── qb_boq_items.mi_id  (priced quantity)
--
-- Every BOQ quantity can be traced: BOQ → MI → line → drawing measurement → drawing
-- ============================================================
