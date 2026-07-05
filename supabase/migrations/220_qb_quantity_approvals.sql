-- ============================================================
-- 220: Quantity approvals
-- ============================================================
-- Append-only sign-off log for the "Approved Quantity" shown on
-- the Quantity Calculation Sheet summary. Mirrors qb_quantity_changes
-- (213) rather than caching approval state on qb_boq_items — the
-- current approved quantity for a BOQ item is the most recent row
-- here, ordered by approved_at. Does not touch qb_sync_boq_qty or
-- any generated column.
-- ============================================================

CREATE TABLE qb_quantity_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  boq_item_id         UUID NOT NULL REFERENCES qb_boq_items(id) ON DELETE CASCADE,
  mi_id               UUID REFERENCES qb_measurement_items(id) ON DELETE SET NULL,
  calculated_quantity NUMERIC NOT NULL,
  approved_quantity   NUMERIC NOT NULL,
  unit                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'approved'
                      CHECK (status IN ('draft','pending','approved','rejected')),
  approver_name       TEXT,
  approver_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_qapproval_boq ON qb_quantity_approvals(boq_item_id);
CREATE INDEX idx_qb_qapproval_project ON qb_quantity_approvals(project_id);

ALTER TABLE qb_quantity_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_project_owner" ON qb_quantity_approvals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));
