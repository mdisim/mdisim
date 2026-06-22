-- ============================================
-- MIGRATION 100: Clean rebuild — Projects, Drawings, Measurement Book
-- ============================================
-- This migration creates the core tables for the Measurement Book + BOQ + Pricing system.
-- Phase 1: projects
-- Phase 2: drawings, drawing_calibrations
-- Phase 3: measurement_items, measurement_lines
-- ============================================

-- ── PROJECTS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  location    TEXT,
  currency    VARCHAR(10) DEFAULT 'USD',
  vat_pct     NUMERIC(5,2) DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own projects" ON projects;
CREATE POLICY "Users manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── DRAWINGS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drawings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  drawing_type  VARCHAR(50) DEFAULT 'other',
  revision      VARCHAR(50),
  file_path     TEXT NOT NULL,
  file_type     VARCHAR(20) NOT NULL,
  file_size     BIGINT,
  page_count    INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_drawing_type CHECK (drawing_type IN ('architectural','structural','electrical','mechanical','other')),
  CONSTRAINT chk_file_type CHECK (file_type IN ('pdf','dwg','dxf','png','jpg','jpeg'))
);

CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own drawings" ON drawings;
CREATE POLICY "Users manage own drawings" ON drawings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── DRAWING CALIBRATIONS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drawing_calibrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id    UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  page_number   INT NOT NULL DEFAULT 1,
  point1_x      NUMERIC NOT NULL,
  point1_y      NUMERIC NOT NULL,
  point2_x      NUMERIC NOT NULL,
  point2_y      NUMERIC NOT NULL,
  real_length   NUMERIC NOT NULL,
  unit          VARCHAR(20) DEFAULT 'm',
  scale_factor  NUMERIC NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibrations_drawing ON drawing_calibrations(drawing_id);

ALTER TABLE drawing_calibrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage calibrations via drawing" ON drawing_calibrations;
CREATE POLICY "Users manage calibrations via drawing" ON drawing_calibrations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM drawings d WHERE d.id = drawing_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM drawings d WHERE d.id = drawing_id AND d.user_id = auth.uid()));

-- ── MEASUREMENT ITEMS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS measurement_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_code       VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
  section         VARCHAR(255),
  drawing_ref     VARCHAR(255),
  location        VARCHAR(255),
  sort_order      INT DEFAULT 0,
  total_qty       NUMERIC DEFAULT 0,
  additions_qty   NUMERIC DEFAULT 0,
  deductions_qty  NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mitems_project ON measurement_items(project_id);

ALTER TABLE measurement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own measurement items" ON measurement_items;
CREATE POLICY "Users manage own measurement items" ON measurement_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── MEASUREMENT LINES ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS measurement_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES measurement_items(id) ON DELETE CASCADE,
  line_number     INT NOT NULL DEFAULT 1,
  description     TEXT,
  location        VARCHAR(255),
  count           NUMERIC DEFAULT 1,
  length          NUMERIC,
  width           NUMERIC,
  height          NUMERIC,
  formula         TEXT,
  is_deduction    BOOLEAN DEFAULT false,
  quantity        NUMERIC DEFAULT 0,
  notes           TEXT,
  drawing_id      UUID REFERENCES drawings(id) ON DELETE SET NULL,
  page_number     INT,
  points          JSONB,
  scale_used      NUMERIC,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mlines_item ON measurement_lines(item_id);

ALTER TABLE measurement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage lines via item" ON measurement_lines;
CREATE POLICY "Users manage lines via item" ON measurement_lines
  FOR ALL
  USING (EXISTS (SELECT 1 FROM measurement_items mi WHERE mi.id = item_id AND mi.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM measurement_items mi WHERE mi.id = item_id AND mi.user_id = auth.uid()));

-- ── TRIGGER: auto-update updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_drawings_updated ON drawings;
CREATE TRIGGER trg_drawings_updated BEFORE UPDATE ON drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mitems_updated ON measurement_items;
CREATE TRIGGER trg_mitems_updated BEFORE UPDATE ON measurement_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mlines_updated ON measurement_lines;
CREATE TRIGGER trg_mlines_updated BEFORE UPDATE ON measurement_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TRIGGER: recalculate item totals when lines change ──────────────────

CREATE OR REPLACE FUNCTION recalc_measurement_item_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id UUID;
BEGIN
  target_item_id := COALESCE(NEW.item_id, OLD.item_id);
  UPDATE measurement_items SET
    additions_qty  = COALESCE((SELECT SUM(quantity) FROM measurement_lines WHERE item_id = target_item_id AND NOT is_deduction), 0),
    deductions_qty = COALESCE((SELECT SUM(ABS(quantity)) FROM measurement_lines WHERE item_id = target_item_id AND is_deduction), 0),
    total_qty      = COALESCE((SELECT SUM(quantity) FROM measurement_lines WHERE item_id = target_item_id), 0)
  WHERE id = target_item_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalc_totals ON measurement_lines;
CREATE TRIGGER trg_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON measurement_lines
  FOR EACH ROW EXECUTE FUNCTION recalc_measurement_item_totals();

-- ── STORAGE BUCKET for drawings ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload drawings" ON storage.objects;
CREATE POLICY "Users upload drawings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'drawings' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users read own drawings" ON storage.objects;
CREATE POLICY "Users read own drawings" ON storage.objects
  FOR SELECT USING (bucket_id = 'drawings' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users delete own drawings" ON storage.objects;
CREATE POLICY "Users delete own drawings" ON storage.objects
  FOR DELETE USING (bucket_id = 'drawings' AND auth.uid() IS NOT NULL);
