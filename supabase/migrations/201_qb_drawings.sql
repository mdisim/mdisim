-- ============================================================
-- 201: qb_drawings + qb_drawing_scales + qb_drawing_measurements
-- ============================================================

CREATE TABLE qb_drawings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  drawing_type  TEXT NOT NULL DEFAULT 'other'
                CHECK (drawing_type IN (
                  'architectural','structural','electrical','mechanical',
                  'plumbing','civil','landscape','other'
                )),
  revision      TEXT,
  file_path     TEXT NOT NULL,
  file_type     TEXT NOT NULL
                CHECK (file_type IN ('pdf','dwg','dxf','png','jpg','jpeg')),
  file_size     BIGINT,
  page_count    INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_drawings_project ON qb_drawings(project_id);

ALTER TABLE qb_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON qb_drawings
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_qb_drawings_updated
  BEFORE UPDATE ON qb_drawings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Scale calibrations ──────────────────────────────────────
-- Multiple calibrations per page are allowed (different areas
-- of a drawing may have different scales).

CREATE TABLE qb_drawing_scales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id    UUID NOT NULL REFERENCES qb_drawings(id) ON DELETE CASCADE,
  page_number   INT NOT NULL DEFAULT 1,
  label         TEXT,           -- optional user label, e.g. "Main plan scale"
  -- Two reference points in pixel coordinates
  pt1_x         NUMERIC NOT NULL,
  pt1_y         NUMERIC NOT NULL,
  pt2_x         NUMERIC NOT NULL,
  pt2_y         NUMERIC NOT NULL,
  -- Real-world distance between those two points
  real_length   NUMERIC NOT NULL CHECK (real_length > 0),
  unit          VARCHAR(20) NOT NULL DEFAULT 'm',
  -- Derived: pixels per real-world unit (stored to avoid recomputation)
  px_per_unit   NUMERIC NOT NULL CHECK (px_per_unit > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No UNIQUE constraint: multiple scales per page allowed
);

CREATE INDEX idx_qb_scales_drawing ON qb_drawing_scales(drawing_id);
CREATE INDEX idx_qb_scales_page    ON qb_drawing_scales(drawing_id, page_number);

ALTER TABLE qb_drawing_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_drawing_owner" ON qb_drawing_scales
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_drawings d
    WHERE d.id = drawing_id AND d.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_drawings d
    WHERE d.id = drawing_id AND d.user_id = auth.uid()
  ));

-- ── Drawing measurement tools enum ──────────────────────────

CREATE TYPE qb_drawing_tool AS ENUM (
  'line',        -- two-point distance
  'polyline',    -- multi-segment length
  'area',        -- closed polygon area
  'rectangle',   -- axis-aligned rectangle
  'circle',      -- center + radius
  'count'        -- point markers
);

-- ── Drawing measurements ────────────────────────────────────
-- Each row is one measurement taken on a drawing with a tool.
-- This is the "takeoff" layer that sits between drawings and
-- the measurement book.

CREATE TABLE qb_drawing_measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id      UUID NOT NULL REFERENCES qb_drawings(id) ON DELETE CASCADE,
  page_number     INT NOT NULL DEFAULT 1,
  scale_id        UUID REFERENCES qb_drawing_scales(id) ON DELETE SET NULL,
  tool_type       qb_drawing_tool NOT NULL,
  -- Raw coordinates captured on the drawing canvas
  coordinates     JSONB NOT NULL,
  -- Calculated real-world quantity (using the linked scale)
  quantity        NUMERIC NOT NULL DEFAULT 0,
  unit            VARCHAR(20),     -- inferred from tool: m, m², nr
  -- Display
  label           TEXT,
  color           VARCHAR(20) NOT NULL DEFAULT '#f59e0b',
  notes           TEXT,
  -- OCR future-proofing
  ocr_source      TEXT,            -- e.g. 'tesseract', 'google-vision'
  ocr_confidence  NUMERIC(5,4),    -- 0.0000 – 1.0000
  ocr_text        TEXT,            -- raw OCR output
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_dm_drawing ON qb_drawing_measurements(drawing_id);
CREATE INDEX idx_qb_dm_page    ON qb_drawing_measurements(drawing_id, page_number);

ALTER TABLE qb_drawing_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_drawing_owner" ON qb_drawing_measurements
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_drawings d
    WHERE d.id = drawing_id AND d.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_drawings d
    WHERE d.id = drawing_id AND d.user_id = auth.uid()
  ));

CREATE TRIGGER trg_qb_dm_updated
  BEFORE UPDATE ON qb_drawing_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Storage bucket ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('qb-drawings', 'qb-drawings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "qb_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qb-drawings' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "qb_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'qb-drawings' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "qb_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'qb-drawings' AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- COORDINATES JSONB FORMAT (by tool_type)
-- ============================================================
--
-- line:      { "points": [[x1,y1],[x2,y2]] }
-- polyline:  { "points": [[x1,y1],[x2,y2],...,[xN,yN]] }
-- area:      { "points": [[x1,y1],[x2,y2],...,[xN,yN]] }  (closed)
-- rectangle: { "origin": [x,y], "width": w, "height": h }
-- circle:    { "center": [x,y], "radius": r }
-- count:     { "points": [[x1,y1],[x2,y2],...] }
--
-- All coordinates are in PDF/canvas pixel space.
-- Real-world quantity is computed using the linked scale.
-- ============================================================
