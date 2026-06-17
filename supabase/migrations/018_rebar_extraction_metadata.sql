-- Migration 018: Store OCR extraction metadata for marked drawing integration
-- Stores page render images and callout bbox positions so the marked drawing
-- can be loaded without re-running OCR.

-- Add source drawing tracking to elements
ALTER TABLE rebar_elements
  ADD COLUMN IF NOT EXISTS source_drawing_id uuid REFERENCES drawing_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer;

-- Store per-bar OCR bbox position for marked drawing placement
ALTER TABLE rebar_bars
  ADD COLUMN IF NOT EXISTS ocr_bbox jsonb DEFAULT NULL,
  -- { x0, y0, x1, y1, canvasW, canvasH, page }
  ADD COLUMN IF NOT EXISTS ocr_confidence integer DEFAULT NULL;

-- Store rendered page images for marked drawing (one row per page per extraction)
CREATE TABLE IF NOT EXISTS rebar_extraction_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL REFERENCES drawing_files(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  image_storage_path text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rebar_extraction_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own extraction pages" ON rebar_extraction_pages;
CREATE POLICY "Users see own extraction pages" ON rebar_extraction_pages
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_rebar_extraction_pages_project ON rebar_extraction_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_rebar_extraction_pages_drawing ON rebar_extraction_pages(drawing_id);
