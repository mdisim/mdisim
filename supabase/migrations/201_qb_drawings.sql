-- ============================================================
-- 201: qb_drawings + qb_drawing_scales
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

CREATE TABLE qb_drawing_scales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id    UUID NOT NULL REFERENCES qb_drawings(id) ON DELETE CASCADE,
  page_number   INT NOT NULL DEFAULT 1,
  -- Two reference points in pixel coordinates
  pt1_x         NUMERIC NOT NULL,
  pt1_y         NUMERIC NOT NULL,
  pt2_x         NUMERIC NOT NULL,
  pt2_y         NUMERIC NOT NULL,
  -- Real-world length between those two points
  real_length   NUMERIC NOT NULL CHECK (real_length > 0),
  unit          VARCHAR(20) NOT NULL DEFAULT 'm',
  -- Derived: pixels-per-real-unit  (stored so we don't recompute)
  px_per_unit   NUMERIC NOT NULL CHECK (px_per_unit > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drawing_id, page_number)
);

CREATE INDEX idx_qb_scales_drawing ON qb_drawing_scales(drawing_id);

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

-- ── Storage bucket ──────────────────────────────────────────
-- Idempotent: only inserts if not already present.

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
