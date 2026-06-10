-- ============================================
-- SPRINT 4 MIGRATIONS
-- ============================================

-- TENDERS
CREATE TABLE IF NOT EXISTS tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  client_name text,
  tender_number text,
  issue_date date,
  submission_deadline date,
  status text NOT NULL DEFAULT 'draft',
  estimated_value numeric(15,2) DEFAULT 0,
  submitted_value numeric(15,2),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own company tenders" ON tenders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.company_id = tenders.company_id AND profiles.id = auth.uid())
  );

-- PROJECT CONTRACTS
CREATE TABLE IF NOT EXISTS project_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES contractors(id),
  title text NOT NULL,
  contract_number text,
  contract_type text DEFAULT 'lump_sum',
  value numeric(15,2) DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  retention_percent numeric(5,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE project_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project contracts" ON project_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_contracts.project_id AND projects.created_by = auth.uid())
  );

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier text NOT NULL,
  description text,
  category text,
  quantity numeric(10,2) DEFAULT 1,
  unit text,
  unit_price numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  order_date date,
  expected_delivery date,
  actual_delivery date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project POs" ON purchase_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = purchase_orders.project_id AND projects.created_by = auth.uid())
  );
