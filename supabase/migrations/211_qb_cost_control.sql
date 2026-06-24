-- ============================================================
-- 211: Cost Control & Variations
-- Budget tracking, variations, change orders, cost forecasting
-- ============================================================

-- Contract / budget header per project
CREATE TABLE qb_contracts (
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

-- Variations / Change Orders
CREATE TABLE qb_variations (
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

-- Variation line items
CREATE TABLE qb_variation_items (
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

-- Cost tracking entries (monthly or periodic)
CREATE TABLE qb_cost_entries (
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

-- Cash flow projections
CREATE TABLE qb_cashflow (
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

-- RLS
ALTER TABLE qb_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_variation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_cashflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_via_project ON qb_contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_contracts.project_id AND p.created_by = auth.uid())
);
CREATE POLICY variations_via_project ON qb_variations FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_variations.project_id AND p.created_by = auth.uid())
);
CREATE POLICY variation_items_via_project ON qb_variation_items FOR ALL USING (
  EXISTS (SELECT 1 FROM qb_variations v JOIN projects p ON p.id = v.project_id
          WHERE v.id = qb_variation_items.variation_id AND p.created_by = auth.uid())
);
CREATE POLICY cost_entries_via_project ON qb_cost_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cost_entries.project_id AND p.created_by = auth.uid())
);
CREATE POLICY cashflow_via_project ON qb_cashflow FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cashflow.project_id AND p.created_by = auth.uid())
);

CREATE INDEX idx_qb_variations_project ON qb_variations(project_id);
CREATE INDEX idx_qb_variation_items_var ON qb_variation_items(variation_id);
CREATE INDEX idx_qb_cost_entries_project ON qb_cost_entries(project_id);
CREATE INDEX idx_qb_cashflow_project ON qb_cashflow(project_id);
