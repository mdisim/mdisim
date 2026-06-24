-- ============================================================
-- FIX: Ensure all qb_ table FKs reference production "projects"
-- ============================================================
-- Run this FIRST if you see FK constraint errors.
-- Safe to run multiple times — uses DROP IF EXISTS / IF NOT EXISTS.
--
-- Root cause: migrations 200-203 created qb_ tables referencing
-- qb_projects(id), but the app uses the production projects table.
-- Migrations 207-208 fix this, but may not have been applied.
-- This script fixes ALL FKs unconditionally.
-- ============================================================

BEGIN;

-- ── qb_drawings ───────────────────────────────────────────────
ALTER TABLE qb_drawings
  DROP CONSTRAINT IF EXISTS qb_drawings_project_id_fkey;
ALTER TABLE qb_drawings
  ADD CONSTRAINT qb_drawings_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ── qb_measurement_items ──────────────────────────────────────
ALTER TABLE qb_measurement_items
  DROP CONSTRAINT IF EXISTS qb_measurement_items_project_id_fkey;
ALTER TABLE qb_measurement_items
  ADD CONSTRAINT qb_measurement_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ── qb_boq_items ──────────────────────────────────────────────
ALTER TABLE qb_boq_items
  DROP CONSTRAINT IF EXISTS qb_boq_items_project_id_fkey;
ALTER TABLE qb_boq_items
  ADD CONSTRAINT qb_boq_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ── Fix RLS policies to use projects.created_by ───────────────

-- qb_measurement_items
DROP POLICY IF EXISTS "via_project_owner" ON qb_measurement_items;
CREATE POLICY "via_project_owner" ON qb_measurement_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

-- qb_measurement_lines
DROP POLICY IF EXISTS "via_item_owner" ON qb_measurement_lines;
CREATE POLICY "via_item_owner" ON qb_measurement_lines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.created_by = auth.uid()
  ));

-- qb_boq_items
DROP POLICY IF EXISTS "via_project_owner" ON qb_boq_items;
CREATE POLICY "via_project_owner" ON qb_boq_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

-- qb_drawings (uses user_id owner pattern, not project join)
-- RLS already correct — checks user_id = auth.uid() directly

-- ── Clean up orphaned rows ────────────────────────────────────
-- Delete any qb_ rows whose project_id doesn't exist in projects.
-- These are leftovers from when FKs pointed to qb_projects.

DELETE FROM qb_measurement_lines WHERE item_id IN (
  SELECT mi.id FROM qb_measurement_items mi
  LEFT JOIN projects p ON p.id = mi.project_id
  WHERE p.id IS NULL
);

DELETE FROM qb_measurement_items WHERE project_id NOT IN (
  SELECT id FROM projects
);

DELETE FROM qb_boq_items WHERE project_id NOT IN (
  SELECT id FROM projects
);

DELETE FROM qb_drawing_measurements WHERE drawing_id IN (
  SELECT d.id FROM qb_drawings d
  LEFT JOIN projects p ON p.id = d.project_id
  WHERE p.id IS NULL
);

DELETE FROM qb_drawing_scales WHERE drawing_id IN (
  SELECT d.id FROM qb_drawings d
  LEFT JOIN projects p ON p.id = d.project_id
  WHERE p.id IS NULL
);

DELETE FROM qb_drawings WHERE project_id NOT IN (
  SELECT id FROM projects
);

-- ── Verify ────────────────────────────────────────────────────
-- After running, these should return 0:
-- SELECT count(*) FROM qb_measurement_items mi LEFT JOIN projects p ON p.id = mi.project_id WHERE p.id IS NULL;
-- SELECT count(*) FROM qb_boq_items b LEFT JOIN projects p ON p.id = b.project_id WHERE p.id IS NULL;
-- SELECT count(*) FROM qb_drawings d LEFT JOIN projects p ON p.id = d.project_id WHERE p.id IS NULL;

COMMIT;
