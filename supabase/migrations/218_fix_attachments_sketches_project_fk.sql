-- ============================================================
-- FIX: qb_quantity_attachments / qb_measurement_sketches still
-- reference the old qb_projects/user_id scaffolding instead of
-- the production projects/created_by table (as 215 already did
-- for qb_drawings/qb_measurement_items/qb_boq_items).
--
-- Without this fix, attachments and sketches are invisible under
-- RLS for any project that isn't also present in the dead
-- qb_projects table — the Quantity Calculation Sheet depends on
-- both, so this must run first.
--
-- Safe to run multiple times.
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- STEP 1: Drop old FKs
-- ────────────────────────────────────────────────────────────────

ALTER TABLE qb_quantity_attachments
  DROP CONSTRAINT IF EXISTS qb_quantity_attachments_project_id_fkey;

ALTER TABLE qb_measurement_sketches
  DROP CONSTRAINT IF EXISTS qb_measurement_sketches_project_id_fkey;

-- ────────────────────────────────────────────────────────────────
-- STEP 2: Delete orphaned rows whose project_id is NOT in projects
-- Must run BEFORE adding new FKs, otherwise the constraint blocks.
-- ────────────────────────────────────────────────────────────────

DELETE FROM qb_quantity_attachments
  WHERE project_id NOT IN (SELECT id FROM projects);

DELETE FROM qb_measurement_sketches
  WHERE project_id NOT IN (SELECT id FROM projects);

-- ────────────────────────────────────────────────────────────────
-- STEP 3: Re-add FKs pointing to production projects table
-- ────────────────────────────────────────────────────────────────

ALTER TABLE qb_quantity_attachments
  ADD CONSTRAINT qb_quantity_attachments_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE qb_measurement_sketches
  ADD CONSTRAINT qb_measurement_sketches_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────────
-- STEP 4: Fix RLS policies to use projects.created_by
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "via_project_owner" ON qb_quantity_attachments;
CREATE POLICY "via_project_owner" ON qb_quantity_attachments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "via_project_owner" ON qb_measurement_sketches;
CREATE POLICY "via_project_owner" ON qb_measurement_sketches
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

-- ────────────────────────────────────────────────────────────────
-- DONE. Verify with:
--   SELECT 'qb_quantity_attachments' AS tbl, count(*) FROM qb_quantity_attachments a LEFT JOIN projects p ON p.id = a.project_id WHERE p.id IS NULL
--   UNION ALL
--   SELECT 'qb_measurement_sketches', count(*) FROM qb_measurement_sketches s LEFT JOIN projects p ON p.id = s.project_id WHERE p.id IS NULL;
-- All counts should be 0.
-- ────────────────────────────────────────────────────────────────
