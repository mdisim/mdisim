-- ============================================================
-- 222: Server-side sort_order assignment on insert
-- ============================================================
-- Every insert path in the app layer currently does
-- "SELECT max(sort_order) -> +1 -> INSERT" as two separate
-- round-trips with no locking in between. Two rapid inserts for
-- the same parent (double-click, or two browser tabs) can read
-- the same max and both insert with the same sort_order.
--
-- Move the +1 computation server-side, inside the same
-- transaction as the insert, closing the network round-trip
-- window (the most common real-world trigger). This narrows but
-- does not fully eliminate the race under true concurrent
-- transactions at REPEATED READ/SERIALIZABLE isolation edge
-- cases — a full fix would need row-level locking or a
-- per-parent sequence, which is disproportionate for a tool used
-- by one QS engineer at a time per project/drawing.
-- ============================================================

CREATE OR REPLACE FUNCTION public.qb_assign_sort_order_by_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.sort_order := COALESCE(
    (SELECT MAX(sort_order) + 1 FROM qb_measurement_items WHERE project_id = NEW.project_id),
    0
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_mi_sort_order
  BEFORE INSERT ON qb_measurement_items
  FOR EACH ROW EXECUTE FUNCTION public.qb_assign_sort_order_by_project();

CREATE OR REPLACE FUNCTION public.qb_assign_line_sort_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.sort_order := COALESCE(
    (SELECT MAX(sort_order) + 1 FROM qb_measurement_lines WHERE item_id = NEW.item_id),
    0
  );
  IF NEW.line_number IS NULL OR NEW.line_number = 0 THEN
    NEW.line_number := COALESCE(
      (SELECT MAX(line_number) + 1 FROM qb_measurement_lines WHERE item_id = NEW.item_id),
      1
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_ml_sort_order
  BEFORE INSERT ON qb_measurement_lines
  FOR EACH ROW EXECUTE FUNCTION public.qb_assign_line_sort_order();

CREATE OR REPLACE FUNCTION public.qb_assign_boq_sort_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.sort_order := COALESCE(
    (SELECT MAX(sort_order) + 1 FROM qb_boq_items WHERE project_id = NEW.project_id),
    0
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_boq_sort_order
  BEFORE INSERT ON qb_boq_items
  FOR EACH ROW EXECUTE FUNCTION public.qb_assign_boq_sort_order();
