-- ============================================================
-- 217: qb_measurement_sketches
-- Auto-generated or manual engineering sketches linked to
-- a drawing measurement or a measurement item.
-- Stores the canvas snapshot as a data URL or file path,
-- plus overlay metadata (dimensions, formula, scale reference).
-- ============================================================

CREATE TABLE qb_measurement_sketches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  drawing_id      UUID REFERENCES qb_drawings(id) ON DELETE CASCADE,
  drawing_measurement_id UUID REFERENCES qb_drawing_measurements(id) ON DELETE CASCADE,
  mi_id           UUID REFERENCES qb_measurement_items(id) ON DELETE CASCADE,
  -- Sketch image stored as Supabase Storage path
  file_path       TEXT,
  -- Overlay data for rendering/printing
  quantity        NUMERIC,
  unit            VARCHAR(20),
  formula         TEXT,
  scale_label     TEXT,         -- e.g. "1:100"
  page_number     INT,
  drawing_name    TEXT,
  drawing_number  TEXT,
  revision_number TEXT,
  -- Drawing reference for report
  drawing_ref     TEXT,         -- formatted reference e.g. "DWG-A01 Rev B"
  notes           TEXT,
  -- Snapshot metadata
  snapshot_type   TEXT NOT NULL DEFAULT 'auto'
                  CHECK (snapshot_type IN ('auto','manual')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_ms_project ON qb_measurement_sketches(project_id);
CREATE INDEX idx_qb_ms_dm      ON qb_measurement_sketches(drawing_measurement_id);
CREATE INDEX idx_qb_ms_mi      ON qb_measurement_sketches(mi_id);

ALTER TABLE qb_measurement_sketches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_project_owner" ON qb_measurement_sketches
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));
