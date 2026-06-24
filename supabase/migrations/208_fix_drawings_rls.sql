-- ============================================================
-- 208: Fix qb_drawings FK + RLS to use production projects
-- ============================================================

-- Fix FK
ALTER TABLE qb_drawings
  DROP CONSTRAINT IF EXISTS qb_drawings_project_id_fkey;
ALTER TABLE qb_drawings
  ADD CONSTRAINT qb_drawings_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Fix RLS: qb_drawings uses user_id directly (owner pattern)
-- No change needed — it already checks user_id = auth.uid()

-- Fix RLS: qb_drawing_scales (via drawing owner)
-- Already correct — checks via qb_drawings.user_id

-- Fix RLS: qb_drawing_measurements (via drawing owner)
-- Already correct — checks via qb_drawings.user_id
