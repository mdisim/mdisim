-- ============================================================
-- 207: Fix RLS + FKs to use production "projects" table
-- ============================================================
-- The qb_ tables were created referencing qb_projects, but the
-- app uses the existing production "projects" table (which has
-- created_by, not user_id). This migration fixes FKs and RLS.
-- ============================================================

-- ── Fix FKs ────────────────────────────────────────────────────

ALTER TABLE qb_measurement_items
  DROP CONSTRAINT IF EXISTS qb_measurement_items_project_id_fkey;
ALTER TABLE qb_measurement_items
  ADD CONSTRAINT qb_measurement_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE qb_boq_items
  DROP CONSTRAINT IF EXISTS qb_boq_items_project_id_fkey;
ALTER TABLE qb_boq_items
  ADD CONSTRAINT qb_boq_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ── Fix RLS: qb_measurement_items ──────────────────────────────

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

-- ── Fix RLS: qb_measurement_lines ──────────────────────────────

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

-- ── Fix RLS: qb_boq_items ─────────────────────────────────────

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
