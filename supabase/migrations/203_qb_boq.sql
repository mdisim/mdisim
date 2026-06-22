-- ============================================================
-- 203: qb_boq_items — Bill of Quantities linked to measurements
-- ============================================================
-- Each BOQ item can optionally link to a measurement item
-- via mi_id. When linked, "quantity" should reflect mi.net_qty
-- (enforced in application layer, not by trigger, so users
--  can also manually override or add standalone BOQ items).
-- ============================================================

CREATE TABLE qb_boq_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  -- Optional link to measurement item
  mi_id           UUID REFERENCES qb_measurement_items(id) ON DELETE SET NULL,
  code            VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
  -- Quantity — auto-synced from measurement item, or manual
  quantity        NUMERIC NOT NULL DEFAULT 0,
  -- Pricing
  unit_rate       NUMERIC(15,4) NOT NULL DEFAULT 0,
  material_rate   NUMERIC(15,4),
  labor_rate      NUMERIC(15,4),
  equipment_rate  NUMERIC(15,4),
  -- Computed total  (quantity × unit_rate)
  total_amount    NUMERIC(15,4) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  section         TEXT,
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_boq_project ON qb_boq_items(project_id);
CREATE INDEX idx_qb_boq_mi      ON qb_boq_items(mi_id);
CREATE INDEX idx_qb_boq_section ON qb_boq_items(section);

ALTER TABLE qb_boq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_project_owner" ON qb_boq_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

CREATE TRIGGER trg_qb_boq_updated
  BEFORE UPDATE ON qb_boq_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Trigger: sync BOQ quantity when measurement item totals change ──

CREATE OR REPLACE FUNCTION public.qb_sync_boq_qty()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When a measurement item's net_qty changes, push it to any linked BOQ rows
  IF NEW.net_qty IS DISTINCT FROM OLD.net_qty THEN
    UPDATE qb_boq_items
    SET quantity = NEW.net_qty
    WHERE mi_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_sync_boq
  AFTER UPDATE OF net_qty ON qb_measurement_items
  FOR EACH ROW EXECUTE FUNCTION public.qb_sync_boq_qty();
