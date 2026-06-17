-- Migration 019: Fix extraction persistence
-- 1. Add missing columns to rebar_elements and rebar_bars (safe re-run with IF NOT EXISTS)
-- 2. Update drawings bucket to accept image/jpeg and image/png for OCR page renders
-- 3. Increase bucket file size limit to 100 MB

-- ─── Missing columns on rebar_elements ──────────────────────────────────────
ALTER TABLE rebar_elements
  ADD COLUMN IF NOT EXISTS source_drawing_id uuid REFERENCES drawing_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page integer;

-- ─── Missing columns on rebar_bars ──────────────────────────────────────────
ALTER TABLE rebar_bars
  ADD COLUMN IF NOT EXISTS ocr_bbox jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ocr_confidence integer DEFAULT NULL;

-- ─── rebar_extraction_pages table ───────────────────────────────────────────
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

-- ─── Fix drawings bucket: add image MIME types + 100 MB limit ───────────────
UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf',
    'application/octet-stream',
    'image/vnd.dxf',
    'application/dxf',
    'image/jpeg',
    'image/png'
  ]
WHERE id = 'drawings';

-- ─── Notify PostgREST to refresh schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
