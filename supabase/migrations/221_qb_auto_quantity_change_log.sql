-- ============================================================
-- 221: Automatic quantity change log
-- ============================================================
-- qb_quantity_changes was previously only ever written to by
-- explicit app-level calls (drawing-revision compare, "apply
-- suggestion" flows). That means most real quantity edits —
-- a manual correction, an AI-approved element, a volume entry,
-- the takeoff-sync trigger updating qb_boq_items.quantity from
-- a re-measured drawing — left no audit trail at all.
--
-- Make it automatic and universal: any change to
-- qb_boq_items.quantity, from any source, logs a row here.
-- This does not replace the existing manual call sites (a
-- revision-compare "apply" can still pass a richer description),
-- it just guarantees no path is silently unaudited.
-- ============================================================

CREATE OR REPLACE FUNCTION public.qb_log_boq_quantity_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    INSERT INTO qb_quantity_changes (
      project_id, boq_item_id, mi_id, description,
      previous_qty, new_qty, unit, change_type
    ) VALUES (
      NEW.project_id, NEW.id, NEW.mi_id, NEW.description,
      OLD.quantity, NEW.quantity, NEW.unit, 'remeasurement'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_log_boq_qty_change
  AFTER UPDATE OF quantity ON qb_boq_items
  FOR EACH ROW EXECUTE FUNCTION public.qb_log_boq_quantity_change();
