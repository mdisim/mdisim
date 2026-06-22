-- ============================================================
-- 202: qb_measurement_items + qb_measurement_lines
-- ============================================================
-- The measurement book: items group lines; lines hold the
-- N × L × W × H (or formula) rows that produce quantities.
-- A DB trigger keeps item totals in sync.
-- ============================================================

-- ── Measurement items ───────────────────────────────────────

CREATE TABLE qb_measurement_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  item_code       VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
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
  -- Dimensions
  nr              NUMERIC NOT NULL DEFAULT 1,    -- count / repetitions
  length          NUMERIC,
  width           NUMERIC,
  height          NUMERIC,
  -- Optional free-form formula (overrides N×L×W×H when non-null)
  formula         TEXT,
  -- Addition vs deduction
  is_deduction    BOOLEAN NOT NULL DEFAULT false,
  -- Computed quantity (set by app or trigger; negative for deductions)
  quantity        NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT,
  -- Optional link back to a drawing measurement
  drawing_id      UUID REFERENCES qb_drawings(id) ON DELETE SET NULL,
  page_number     INT,
  geo_json        JSONB,        -- polyline / polygon points on the drawing
  scale_id        UUID REFERENCES qb_drawing_scales(id) ON DELETE SET NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_ml_item    ON qb_measurement_lines(item_id);
CREATE INDEX idx_qb_ml_drawing ON qb_measurement_lines(drawing_id);

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
  -- Determine which item was affected
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

  RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$;

CREATE TRIGGER trg_qb_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON qb_measurement_lines
  FOR EACH ROW EXECUTE FUNCTION public.qb_recalc_item_totals();
