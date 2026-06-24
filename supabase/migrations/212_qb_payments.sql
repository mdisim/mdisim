-- ============================================================
-- 212: Payment Certificates (IPC)
-- Monthly payment workflow with retention, VAT, advance recovery
-- ============================================================

-- Payment certificates (Interim Payment Certificates)
CREATE TABLE qb_payment_certs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cert_number       int NOT NULL,
  period_from       date NOT NULL,
  period_to         date NOT NULL,
  status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','checked','approved','paid')),
  -- Gross amounts
  gross_amount         numeric NOT NULL DEFAULT 0,
  previous_gross       numeric NOT NULL DEFAULT 0,
  current_gross        numeric GENERATED ALWAYS AS (gross_amount - previous_gross) STORED,
  -- Variations
  variations_amount    numeric NOT NULL DEFAULT 0,
  -- Retention
  retention_pct        numeric NOT NULL DEFAULT 10,
  retention_amount     numeric NOT NULL DEFAULT 0,
  previous_retention   numeric NOT NULL DEFAULT 0,
  current_retention    numeric GENERATED ALWAYS AS (retention_amount - previous_retention) STORED,
  -- Advance recovery
  advance_recovery     numeric NOT NULL DEFAULT 0,
  previous_advance_recovery numeric NOT NULL DEFAULT 0,
  current_advance_recovery numeric GENERATED ALWAYS AS (advance_recovery - previous_advance_recovery) STORED,
  -- VAT
  vat_pct              numeric NOT NULL DEFAULT 17,
  vat_amount           numeric NOT NULL DEFAULT 0,
  -- Net payable
  net_payable          numeric NOT NULL DEFAULT 0,
  -- Dates
  submitted_date       date,
  approved_date        date,
  paid_date            date,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, cert_number)
);

-- Payment certificate line items (per BOQ item)
CREATE TABLE qb_payment_lines (
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

-- Trigger: recalculate cert totals when lines change
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

CREATE TRIGGER qb_payment_lines_changed
  AFTER INSERT OR UPDATE OR DELETE ON qb_payment_lines
  FOR EACH ROW EXECUTE FUNCTION qb_recalc_payment_cert();

-- RLS
ALTER TABLE qb_payment_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_payment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY certs_via_project ON qb_payment_certs FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_payment_certs.project_id AND p.created_by = auth.uid())
);
CREATE POLICY cert_lines_via_project ON qb_payment_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM qb_payment_certs c JOIN projects p ON p.id = c.project_id
          WHERE c.id = qb_payment_lines.cert_id AND p.created_by = auth.uid())
);

CREATE INDEX idx_qb_payment_certs_project ON qb_payment_certs(project_id);
CREATE INDEX idx_qb_payment_lines_cert ON qb_payment_lines(cert_id);
