-- ============================================================
-- 223: Line-scoped attachments
-- ============================================================
-- qb_measurement_sketches already scopes to a specific
-- qb_measurement_lines row (line_id, added in 219). Attachments
-- (photos/PDF/Excel/site evidence) could only scope to the whole
-- measurement item or BOQ item, not the exact calculation line
-- they're evidence for. Add the same scoping.
-- ============================================================

ALTER TABLE qb_quantity_attachments
  ADD COLUMN line_id UUID REFERENCES qb_measurement_lines(id) ON DELETE SET NULL;

CREATE INDEX idx_qb_qa_line ON qb_quantity_attachments(line_id);

-- No RLS change needed: existing policy keys off project_id, which
-- already covers this new column.
