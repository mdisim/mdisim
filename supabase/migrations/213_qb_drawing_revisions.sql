-- ============================================================
-- 213: Drawing Revisions & Quantity Change Tracking
-- Track revision history and quantity deltas between revisions
-- ============================================================

-- Drawing revision history
CREATE TABLE qb_drawing_revisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id      uuid NOT NULL REFERENCES qb_drawings(id) ON DELETE CASCADE,
  revision_number text NOT NULL,
  revision_date   date NOT NULL DEFAULT CURRENT_DATE,
  description     text,
  file_path       text,
  file_size       bigint,
  status          text NOT NULL DEFAULT 'current'
    CHECK (status IN ('superseded','current','draft')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Quantity change log between revisions
CREATE TABLE qb_quantity_changes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id        uuid REFERENCES qb_drawings(id) ON DELETE SET NULL,
  from_revision_id  uuid REFERENCES qb_drawing_revisions(id) ON DELETE SET NULL,
  to_revision_id    uuid REFERENCES qb_drawing_revisions(id) ON DELETE SET NULL,
  boq_item_id       uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  mi_id             uuid REFERENCES qb_measurement_items(id) ON DELETE SET NULL,
  description       text NOT NULL,
  previous_qty      numeric NOT NULL DEFAULT 0,
  new_qty           numeric NOT NULL DEFAULT 0,
  difference        numeric GENERATED ALWAYS AS (new_qty - previous_qty) STORED,
  unit              text NOT NULL DEFAULT 'nr',
  change_type       text NOT NULL DEFAULT 'revision'
    CHECK (change_type IN ('revision','correction','variation','remeasurement')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE qb_drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_quantity_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY revisions_via_drawing ON qb_drawing_revisions FOR ALL USING (
  EXISTS (SELECT 1 FROM qb_drawings d JOIN projects p ON p.id = d.project_id
          WHERE d.id = qb_drawing_revisions.drawing_id AND p.created_by = auth.uid())
);
CREATE POLICY qty_changes_via_project ON qb_quantity_changes FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_quantity_changes.project_id AND p.created_by = auth.uid())
);

CREATE INDEX idx_qb_revisions_drawing ON qb_drawing_revisions(drawing_id);
CREATE INDEX idx_qb_qty_changes_project ON qb_quantity_changes(project_id);
CREATE INDEX idx_qb_qty_changes_drawing ON qb_quantity_changes(drawing_id);
