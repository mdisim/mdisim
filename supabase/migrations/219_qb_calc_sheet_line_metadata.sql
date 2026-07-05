-- ============================================================
-- 219: Quantity Calculation Sheet — line-level source metadata
-- ============================================================
-- Adds the source-reference fields a Quantity Calculation Sheet
-- must show per calculation line: floor/level, engineer, date,
-- and a link to the specific drawing revision (drawing name/
-- number/revision are already resolvable via the existing
-- drawing_id FK + this new revision_id FK — no free-text
-- duplication). Also lets a sketch scope to one calculation line
-- instead of only the whole measurement item.
-- ============================================================

ALTER TABLE qb_measurement_lines
  ADD COLUMN floor_level    TEXT,
  ADD COLUMN engineer_name  TEXT,
  ADD COLUMN measured_date  DATE DEFAULT CURRENT_DATE,
  ADD COLUMN revision_id    UUID REFERENCES qb_drawing_revisions(id) ON DELETE SET NULL;

CREATE INDEX idx_qb_ml_revision ON qb_measurement_lines(revision_id);

ALTER TABLE qb_measurement_sketches
  ADD COLUMN line_id UUID REFERENCES qb_measurement_lines(id) ON DELETE SET NULL;

CREATE INDEX idx_qb_ms_line ON qb_measurement_sketches(line_id);

-- No RLS changes needed: both tables' existing policies key off
-- parent ownership (item_id / project_id), which already covers
-- these new columns.
