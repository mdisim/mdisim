-- Sprint 13C: Certificate Line Items

CREATE TABLE IF NOT EXISTS certificate_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES payment_certificates(id) ON DELETE CASCADE,
  boq_item_id uuid REFERENCES boq_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  unit text,
  quantity numeric(15,3),
  unit_rate numeric(15,2),
  amount numeric(15,2),
  certified_pct numeric(5,2) DEFAULT 100,
  certified_amount numeric(15,2),
  cumulative_pct numeric(5,2),
  previous_certified numeric(15,2) DEFAULT 0,
  this_period numeric(15,2),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certificate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members access certificate line items" ON certificate_line_items
  FOR ALL USING (
    certificate_id IN (
      SELECT id FROM payment_certificates
      WHERE project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_cert_line_items_cert ON certificate_line_items(certificate_id);
