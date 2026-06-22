-- ============================================================
-- 205: Wire up FK from qb_boq_items.library_item_id
--       to qb_library_items.id
-- ============================================================
-- Separated because 203 (boq) runs before 204 (library).
-- ============================================================

ALTER TABLE qb_boq_items
  ADD CONSTRAINT fk_boq_library_item
  FOREIGN KEY (library_item_id)
  REFERENCES qb_library_items(id)
  ON DELETE SET NULL;

CREATE INDEX idx_qb_boq_library ON qb_boq_items(library_item_id);
