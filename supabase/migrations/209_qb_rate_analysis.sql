-- ============================================================
-- 209: Rate Analysis Engine
-- Resource-based rate build-up for professional cost estimation
-- ============================================================

-- Resource types: materials, labor, equipment, subcontractor
CREATE TYPE qb_resource_type AS ENUM ('material', 'labor', 'equipment', 'subcontractor');

-- Rate analysis headers (one per BOQ item or library item)
CREATE TABLE qb_rate_analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  boq_item_id  uuid REFERENCES qb_boq_items(id) ON DELETE CASCADE,
  library_item_id uuid REFERENCES qb_library_items(id) ON DELETE SET NULL,
  description  text NOT NULL,
  unit         text NOT NULL DEFAULT 'm',
  output_qty   numeric NOT NULL DEFAULT 1,
  overhead_pct numeric NOT NULL DEFAULT 0,
  profit_pct   numeric NOT NULL DEFAULT 0,
  -- Computed totals (updated by trigger)
  material_total numeric NOT NULL DEFAULT 0,
  labor_total    numeric NOT NULL DEFAULT 0,
  equipment_total numeric NOT NULL DEFAULT 0,
  subcon_total   numeric NOT NULL DEFAULT 0,
  direct_cost    numeric NOT NULL DEFAULT 0,
  overhead_amount numeric NOT NULL DEFAULT 0,
  profit_amount  numeric NOT NULL DEFAULT 0,
  unit_rate      numeric NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Rate analysis resources (line items in the build-up)
CREATE TABLE qb_rate_resources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_analysis_id uuid NOT NULL REFERENCES qb_rate_analyses(id) ON DELETE CASCADE,
  resource_type   qb_resource_type NOT NULL,
  description     text NOT NULL,
  unit            text NOT NULL DEFAULT 'nr',
  quantity        numeric NOT NULL DEFAULT 0,
  unit_cost       numeric NOT NULL DEFAULT 0,
  amount          numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  waste_pct       numeric NOT NULL DEFAULT 0,
  total_amount    numeric GENERATED ALWAYS AS (quantity * unit_cost * (1 + waste_pct / 100)) STORED,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger: recalculate rate analysis totals when resources change
CREATE OR REPLACE FUNCTION qb_recalc_rate_analysis()
RETURNS TRIGGER AS $$
DECLARE
  ra_id uuid;
  mat_total numeric;
  lab_total numeric;
  equip_total numeric;
  sub_total numeric;
  direct numeric;
  oh_pct numeric;
  pr_pct numeric;
  out_qty numeric;
  oh_amt numeric;
  pr_amt numeric;
  final_rate numeric;
BEGIN
  ra_id := COALESCE(NEW.rate_analysis_id, OLD.rate_analysis_id);

  SELECT COALESCE(SUM(total_amount), 0) INTO mat_total
    FROM qb_rate_resources WHERE rate_analysis_id = ra_id AND resource_type = 'material';
  SELECT COALESCE(SUM(total_amount), 0) INTO lab_total
    FROM qb_rate_resources WHERE rate_analysis_id = ra_id AND resource_type = 'labor';
  SELECT COALESCE(SUM(total_amount), 0) INTO equip_total
    FROM qb_rate_resources WHERE rate_analysis_id = ra_id AND resource_type = 'equipment';
  SELECT COALESCE(SUM(total_amount), 0) INTO sub_total
    FROM qb_rate_resources WHERE rate_analysis_id = ra_id AND resource_type = 'subcontractor';

  direct := mat_total + lab_total + equip_total + sub_total;

  SELECT overhead_pct, profit_pct, output_qty INTO oh_pct, pr_pct, out_qty
    FROM qb_rate_analyses WHERE id = ra_id;

  oh_amt := direct * (oh_pct / 100);
  pr_amt := (direct + oh_amt) * (pr_pct / 100);

  IF out_qty > 0 THEN
    final_rate := (direct + oh_amt + pr_amt) / out_qty;
  ELSE
    final_rate := 0;
  END IF;

  UPDATE qb_rate_analyses SET
    material_total = mat_total,
    labor_total = lab_total,
    equipment_total = equip_total,
    subcon_total = sub_total,
    direct_cost = direct,
    overhead_amount = oh_amt,
    profit_amount = pr_amt,
    unit_rate = final_rate,
    updated_at = now()
  WHERE id = ra_id;

  -- Sync unit_rate back to BOQ item if linked
  UPDATE qb_boq_items SET unit_rate = final_rate
    FROM qb_rate_analyses ra
    WHERE ra.id = ra_id AND ra.boq_item_id = qb_boq_items.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qb_rate_resources_changed
  AFTER INSERT OR UPDATE OR DELETE ON qb_rate_resources
  FOR EACH ROW EXECUTE FUNCTION qb_recalc_rate_analysis();

-- RLS
ALTER TABLE qb_rate_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_rate_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_analyses_via_project ON qb_rate_analyses FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_rate_analyses.project_id AND p.created_by = auth.uid())
);

CREATE POLICY rate_resources_via_project ON qb_rate_resources FOR ALL USING (
  EXISTS (
    SELECT 1 FROM qb_rate_analyses ra
    JOIN projects p ON p.id = ra.project_id
    WHERE ra.id = qb_rate_resources.rate_analysis_id AND p.created_by = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_qb_rate_analyses_project ON qb_rate_analyses(project_id);
CREATE INDEX idx_qb_rate_analyses_boq ON qb_rate_analyses(boq_item_id);
CREATE INDEX idx_qb_rate_resources_analysis ON qb_rate_resources(rate_analysis_id);
