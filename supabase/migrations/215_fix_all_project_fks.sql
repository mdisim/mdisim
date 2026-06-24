-- ============================================================
-- FIX: Ensure all qb_ table FKs reference production "projects"
-- ============================================================
-- Safe to run multiple times.
--
-- ORDER OF OPERATIONS:
-- 1. Drop old FKs (so orphaned rows don't block anything)
-- 2. Delete orphaned rows (project_id not in projects)
-- 3. Re-add FKs pointing to projects(id)
-- 4. Fix RLS policies
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- STEP 1: Drop all project_id FKs
-- ────────────────────────────────────────────────────────────────

ALTER TABLE qb_drawings
  DROP CONSTRAINT IF EXISTS qb_drawings_project_id_fkey;

ALTER TABLE qb_measurement_items
  DROP CONSTRAINT IF EXISTS qb_measurement_items_project_id_fkey;

ALTER TABLE qb_boq_items
  DROP CONSTRAINT IF EXISTS qb_boq_items_project_id_fkey;

-- ────────────────────────────────────────────────────────────────
-- STEP 2: Delete orphaned rows whose project_id is NOT in projects
-- Must run BEFORE adding new FKs, otherwise the constraint blocks.
-- ────────────────────────────────────────────────────────────────

-- Drawing children first (measurement/scales depend on drawings)
DELETE FROM qb_drawing_measurements WHERE drawing_id IN (
  SELECT d.id FROM qb_drawings d
  WHERE d.project_id NOT IN (SELECT id FROM projects)
);

DELETE FROM qb_drawing_scales WHERE drawing_id IN (
  SELECT d.id FROM qb_drawings d
  WHERE d.project_id NOT IN (SELECT id FROM projects)
);

DELETE FROM qb_drawings
  WHERE project_id NOT IN (SELECT id FROM projects);

-- Measurement children first
DELETE FROM qb_measurement_lines WHERE item_id IN (
  SELECT mi.id FROM qb_measurement_items mi
  WHERE mi.project_id NOT IN (SELECT id FROM projects)
);

DELETE FROM qb_measurement_items
  WHERE project_id NOT IN (SELECT id FROM projects);

-- BOQ items
DELETE FROM qb_boq_items
  WHERE project_id NOT IN (SELECT id FROM projects);

-- ────────────────────────────────────────────────────────────────
-- STEP 3: Re-add FKs pointing to production projects table
-- ────────────────────────────────────────────────────────────────

ALTER TABLE qb_drawings
  ADD CONSTRAINT qb_drawings_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE qb_measurement_items
  ADD CONSTRAINT qb_measurement_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE qb_boq_items
  ADD CONSTRAINT qb_boq_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────────
-- STEP 4: Fix RLS policies to use projects.created_by
-- ────────────────────────────────────────────────────────────────

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

-- qb_drawings RLS: uses user_id = auth.uid() pattern, unchanged

-- ────────────────────────────────────────────────────────────────
-- DONE. Verify with:
--   SELECT 'qb_measurement_items' AS tbl, count(*) FROM qb_measurement_items mi LEFT JOIN projects p ON p.id = mi.project_id WHERE p.id IS NULL
--   UNION ALL
--   SELECT 'qb_boq_items', count(*) FROM qb_boq_items b LEFT JOIN projects p ON p.id = b.project_id WHERE p.id IS NULL
--   UNION ALL
--   SELECT 'qb_drawings', count(*) FROM qb_drawings d LEFT JOIN projects p ON p.id = d.project_id WHERE p.id IS NULL;
-- All counts should be 0.
-- ────────────────────────────────────────────────────────────────
