-- ============================================================
-- CONSOLIDATED MIGRATIONS 207-214 FOR PRODUCTION DEPLOYMENT
-- Run this in Supabase SQL Editor as a single transaction
-- ============================================================

BEGIN;

-- ============================================================
-- 207: Fix FKs + RLS to use production "projects" table
-- qb_boq_items and qb_measurement_items originally referenced
-- qb_projects(id), but the app uses the production projects table.
-- THIS IS THE ROOT CAUSE of "FK constraint violated" errors on BOQ.
-- ============================================================

-- Fix measurement_items FK
ALTER TABLE qb_measurement_items
  DROP CONSTRAINT IF EXISTS qb_measurement_items_project_id_fkey;
ALTER TABLE qb_measurement_items
  ADD CONSTRAINT qb_measurement_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Fix boq_items FK — THIS FIXES THE BOQ INSERT ERROR
ALTER TABLE qb_boq_items
  DROP CONSTRAINT IF EXISTS qb_boq_items_project_id_fkey;
ALTER TABLE qb_boq_items
  ADD CONSTRAINT qb_boq_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Fix RLS: qb_measurement_items
DROP POLICY IF EXISTS "via_project_owner" ON qb_measurement_items;
CREATE POLICY "via_project_owner" ON qb_measurement_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

-- Fix RLS: qb_measurement_lines
DROP POLICY IF EXISTS "via_item_owner" ON qb_measurement_lines;
CREATE POLICY "via_item_owner" ON qb_measurement_lines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_measurement_items mi
    JOIN projects p ON p.id = mi.project_id
    WHERE mi.id = item_id AND p.created_by = auth.uid()
  ));

-- Fix RLS: qb_boq_items
DROP POLICY IF EXISTS "via_project_owner" ON qb_boq_items;
CREATE POLICY "via_project_owner" ON qb_boq_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));

-- ============================================================
-- 208: Fix qb_drawings FK to use production projects
-- ============================================================
ALTER TABLE qb_drawings
  DROP CONSTRAINT IF EXISTS qb_drawings_project_id_fkey;
ALTER TABLE qb_drawings
  ADD CONSTRAINT qb_drawings_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ============================================================
-- 209: Rate Analysis Engine
-- ============================================================
DO $$ BEGIN CREATE TYPE qb_resource_type AS ENUM ('material', 'labor', 'equipment', 'subcontractor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS qb_rate_analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  boq_item_id  uuid REFERENCES qb_boq_items(id) ON DELETE CASCADE,
  library_item_id uuid REFERENCES qb_library_items(id) ON DELETE SET NULL,
  description  text NOT NULL,
  unit         text NOT NULL DEFAULT 'm',
  output_qty   numeric NOT NULL DEFAULT 1,
  overhead_pct numeric NOT NULL DEFAULT 0,
  profit_pct   numeric NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS qb_rate_resources (
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

  UPDATE qb_boq_items SET unit_rate = final_rate
    FROM qb_rate_analyses ra
    WHERE ra.id = ra_id AND ra.boq_item_id = qb_boq_items.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qb_rate_resources_changed ON qb_rate_resources;
CREATE TRIGGER qb_rate_resources_changed
  AFTER INSERT OR UPDATE OR DELETE ON qb_rate_resources
  FOR EACH ROW EXECUTE FUNCTION qb_recalc_rate_analysis();

ALTER TABLE qb_rate_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_rate_resources ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qb_rate_analyses_project ON qb_rate_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_rate_analyses_boq ON qb_rate_analyses(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_qb_rate_resources_analysis ON qb_rate_resources(rate_analysis_id);

-- ============================================================
-- 210: Tender Management
-- ============================================================
CREATE TABLE IF NOT EXISTS qb_tenders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  tender_number text,
  issue_date    date,
  closing_date  date,
  status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','closed','awarded','cancelled')),
  awarded_bidder_id uuid,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qb_tender_bidders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id   uuid NOT NULL REFERENCES qb_tenders(id) ON DELETE CASCADE,
  name        text NOT NULL,
  company     text,
  email       text,
  phone       text,
  submission_date date,
  status      text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','submitted','disqualified','awarded')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qb_tenders DROP CONSTRAINT IF EXISTS qb_tenders_awarded_fk;
ALTER TABLE qb_tenders
  ADD CONSTRAINT qb_tenders_awarded_fk
  FOREIGN KEY (awarded_bidder_id) REFERENCES qb_tender_bidders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS qb_tender_bids (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id    uuid NOT NULL REFERENCES qb_tenders(id) ON DELETE CASCADE,
  bidder_id    uuid NOT NULL REFERENCES qb_tender_bidders(id) ON DELETE CASCADE,
  boq_item_id  uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  description  text NOT NULL,
  unit         text NOT NULL DEFAULT 'nr',
  quantity     numeric NOT NULL DEFAULT 0,
  unit_rate    numeric NOT NULL DEFAULT 0,
  amount       numeric GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qb_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_tender_bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_tender_bids ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qb_tenders_project ON qb_tenders(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_bidders_tender ON qb_tender_bidders(tender_id);
CREATE INDEX IF NOT EXISTS idx_qb_bids_tender ON qb_tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_qb_bids_bidder ON qb_tender_bids(bidder_id);

-- ============================================================
-- 211: Cost Control & Variations
-- ============================================================
CREATE TABLE IF NOT EXISTS qb_contracts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  contract_value   numeric NOT NULL DEFAULT 0,
  contingency_pct  numeric NOT NULL DEFAULT 5,
  retention_pct    numeric NOT NULL DEFAULT 10,
  advance_pct      numeric NOT NULL DEFAULT 0,
  vat_pct          numeric NOT NULL DEFAULT 17,
  start_date       date,
  end_date         date,
  duration_months  int,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qb_variations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  variation_no  text NOT NULL,
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','approved','rejected','withdrawn')),
  variation_type text NOT NULL DEFAULT 'addition'
    CHECK (variation_type IN ('addition','omission','substitution')),
  submitted_date date,
  approved_date  date,
  amount         numeric NOT NULL DEFAULT 0,
  approved_amount numeric,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qb_variation_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id  uuid NOT NULL REFERENCES qb_variations(id) ON DELETE CASCADE,
  boq_item_id   uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  description   text NOT NULL,
  unit          text NOT NULL DEFAULT 'nr',
  quantity      numeric NOT NULL DEFAULT 0,
  unit_rate     numeric NOT NULL DEFAULT 0,
  amount        numeric GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qb_cost_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_date   date NOT NULL,
  category      text NOT NULL DEFAULT 'actual'
    CHECK (category IN ('actual','committed','forecast')),
  cost_type     text NOT NULL DEFAULT 'direct'
    CHECK (cost_type IN ('direct','indirect','material','labor','equipment','subcontractor','overhead','other')),
  description   text NOT NULL,
  amount        numeric NOT NULL DEFAULT 0,
  boq_item_id   uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qb_cashflow (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_date   date NOT NULL,
  planned_income numeric NOT NULL DEFAULT 0,
  actual_income  numeric NOT NULL DEFAULT 0,
  planned_expense numeric NOT NULL DEFAULT 0,
  actual_expense  numeric NOT NULL DEFAULT 0,
  cumulative_planned_income numeric NOT NULL DEFAULT 0,
  cumulative_actual_income  numeric NOT NULL DEFAULT 0,
  cumulative_planned_expense numeric NOT NULL DEFAULT 0,
  cumulative_actual_expense  numeric NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, period_date)
);

ALTER TABLE qb_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_variation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_cashflow ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qb_variations_project ON qb_variations(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_variation_items_var ON qb_variation_items(variation_id);
CREATE INDEX IF NOT EXISTS idx_qb_cost_entries_project ON qb_cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_cashflow_project ON qb_cashflow(project_id);

-- ============================================================
-- 212: Payment Certificates (IPC)
-- ============================================================
CREATE TABLE IF NOT EXISTS qb_payment_certs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cert_number       int NOT NULL,
  period_from       date NOT NULL,
  period_to         date NOT NULL,
  status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','checked','approved','paid')),
  gross_amount         numeric NOT NULL DEFAULT 0,
  previous_gross       numeric NOT NULL DEFAULT 0,
  current_gross        numeric GENERATED ALWAYS AS (gross_amount - previous_gross) STORED,
  variations_amount    numeric NOT NULL DEFAULT 0,
  retention_pct        numeric NOT NULL DEFAULT 10,
  retention_amount     numeric NOT NULL DEFAULT 0,
  previous_retention   numeric NOT NULL DEFAULT 0,
  current_retention    numeric GENERATED ALWAYS AS (retention_amount - previous_retention) STORED,
  advance_recovery     numeric NOT NULL DEFAULT 0,
  previous_advance_recovery numeric NOT NULL DEFAULT 0,
  current_advance_recovery numeric GENERATED ALWAYS AS (advance_recovery - previous_advance_recovery) STORED,
  vat_pct              numeric NOT NULL DEFAULT 17,
  vat_amount           numeric NOT NULL DEFAULT 0,
  net_payable          numeric NOT NULL DEFAULT 0,
  submitted_date       date,
  approved_date        date,
  paid_date            date,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, cert_number)
);

CREATE TABLE IF NOT EXISTS qb_payment_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id          uuid NOT NULL REFERENCES qb_payment_certs(id) ON DELETE CASCADE,
  boq_item_id      uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  description      text NOT NULL,
  unit             text NOT NULL DEFAULT 'nr',
  contract_qty     numeric NOT NULL DEFAULT 0,
  contract_rate    numeric NOT NULL DEFAULT 0,
  contract_amount  numeric GENERATED ALWAYS AS (contract_qty * contract_rate) STORED,
  previous_qty     numeric NOT NULL DEFAULT 0,
  previous_amount  numeric GENERATED ALWAYS AS (previous_qty * contract_rate) STORED,
  current_qty      numeric NOT NULL DEFAULT 0,
  current_amount   numeric GENERATED ALWAYS AS (current_qty * contract_rate) STORED,
  cumulative_qty   numeric GENERATED ALWAYS AS (previous_qty + current_qty) STORED,
  cumulative_amount numeric GENERATED ALWAYS AS ((previous_qty + current_qty) * contract_rate) STORED,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION qb_recalc_payment_cert()
RETURNS TRIGGER AS $$
DECLARE
  c_id uuid;
  total_cum numeric;
  total_prev numeric;
  ret_pct numeric;
  v_pct numeric;
  gross numeric;
  prev_gross numeric;
  ret numeric;
  prev_ret numeric;
  vat numeric;
  adv numeric;
  prev_adv numeric;
  net numeric;
BEGIN
  c_id := COALESCE(NEW.cert_id, OLD.cert_id);

  SELECT COALESCE(SUM((previous_qty + current_qty) * contract_rate), 0),
         COALESCE(SUM(previous_qty * contract_rate), 0)
    INTO total_cum, total_prev
    FROM qb_payment_lines WHERE cert_id = c_id;

  SELECT retention_pct, vat_pct, advance_recovery, previous_advance_recovery
    INTO ret_pct, v_pct, adv, prev_adv
    FROM qb_payment_certs WHERE id = c_id;

  gross := total_cum;
  prev_gross := total_prev;
  ret := gross * (ret_pct / 100);
  prev_ret := prev_gross * (ret_pct / 100);
  vat := (gross - prev_gross - (ret - prev_ret) - (adv - prev_adv)) * (v_pct / 100);
  IF vat < 0 THEN vat := 0; END IF;
  net := (gross - prev_gross) - (ret - prev_ret) - (adv - prev_adv) + vat;

  UPDATE qb_payment_certs SET
    gross_amount = gross,
    previous_gross = prev_gross,
    retention_amount = ret,
    previous_retention = prev_ret,
    vat_amount = vat,
    net_payable = net,
    updated_at = now()
  WHERE id = c_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qb_payment_lines_changed ON qb_payment_lines;
CREATE TRIGGER qb_payment_lines_changed
  AFTER INSERT OR UPDATE OR DELETE ON qb_payment_lines
  FOR EACH ROW EXECUTE FUNCTION qb_recalc_payment_cert();

ALTER TABLE qb_payment_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_payment_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qb_payment_certs_project ON qb_payment_certs(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_payment_lines_cert ON qb_payment_lines(cert_id);

-- ============================================================
-- 213: Drawing Revisions & Quantity Change Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS qb_drawing_revisions (
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

CREATE TABLE IF NOT EXISTS qb_quantity_changes (
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

ALTER TABLE qb_drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_quantity_changes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qb_revisions_drawing ON qb_drawing_revisions(drawing_id);
CREATE INDEX IF NOT EXISTS idx_qb_qty_changes_project ON qb_quantity_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_qb_qty_changes_drawing ON qb_quantity_changes(drawing_id);

-- ============================================================
-- 214: Fix RLS — Add WITH CHECK to all policies
-- ============================================================

-- 209: Rate Analysis
DROP POLICY IF EXISTS rate_analyses_via_project ON qb_rate_analyses;
CREATE POLICY rate_analyses_via_project ON qb_rate_analyses FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_rate_analyses.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_rate_analyses.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS rate_resources_via_project ON qb_rate_resources;
CREATE POLICY rate_resources_via_project ON qb_rate_resources FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_rate_analyses ra JOIN projects p ON p.id = ra.project_id WHERE ra.id = qb_rate_resources.rate_analysis_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_rate_analyses ra JOIN projects p ON p.id = ra.project_id WHERE ra.id = qb_rate_resources.rate_analysis_id AND p.created_by = auth.uid()));

-- 210: Tenders
DROP POLICY IF EXISTS tenders_via_project ON qb_tenders;
CREATE POLICY tenders_via_project ON qb_tenders FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_tenders.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_tenders.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS bidders_via_project ON qb_tender_bidders;
CREATE POLICY bidders_via_project ON qb_tender_bidders FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bidders.tender_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bidders.tender_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS bids_via_project ON qb_tender_bids;
CREATE POLICY bids_via_project ON qb_tender_bids FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bids.tender_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bids.tender_id AND p.created_by = auth.uid()));

-- 211: Cost Control
DROP POLICY IF EXISTS contracts_via_project ON qb_contracts;
CREATE POLICY contracts_via_project ON qb_contracts FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_contracts.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_contracts.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS variations_via_project ON qb_variations;
CREATE POLICY variations_via_project ON qb_variations FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_variations.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_variations.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS variation_items_via_project ON qb_variation_items;
CREATE POLICY variation_items_via_project ON qb_variation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_variations v JOIN projects p ON p.id = v.project_id WHERE v.id = qb_variation_items.variation_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_variations v JOIN projects p ON p.id = v.project_id WHERE v.id = qb_variation_items.variation_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cost_entries_via_project ON qb_cost_entries;
CREATE POLICY cost_entries_via_project ON qb_cost_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cost_entries.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cost_entries.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cashflow_via_project ON qb_cashflow;
CREATE POLICY cashflow_via_project ON qb_cashflow FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cashflow.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cashflow.project_id AND p.created_by = auth.uid()));

-- 212: Payments
DROP POLICY IF EXISTS certs_via_project ON qb_payment_certs;
CREATE POLICY certs_via_project ON qb_payment_certs FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_payment_certs.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_payment_certs.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cert_lines_via_project ON qb_payment_lines;
CREATE POLICY cert_lines_via_project ON qb_payment_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_payment_certs c JOIN projects p ON p.id = c.project_id WHERE c.id = qb_payment_lines.cert_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_payment_certs c JOIN projects p ON p.id = c.project_id WHERE c.id = qb_payment_lines.cert_id AND p.created_by = auth.uid()));

-- 213: Drawing Revisions
DROP POLICY IF EXISTS revisions_via_drawing ON qb_drawing_revisions;
CREATE POLICY revisions_via_drawing ON qb_drawing_revisions FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_drawings d JOIN projects p ON p.id = d.project_id WHERE d.id = qb_drawing_revisions.drawing_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_drawings d JOIN projects p ON p.id = d.project_id WHERE d.id = qb_drawing_revisions.drawing_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS qty_changes_via_project ON qb_quantity_changes;
CREATE POLICY qty_changes_via_project ON qb_quantity_changes FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_quantity_changes.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_quantity_changes.project_id AND p.created_by = auth.uid()));

COMMIT;
