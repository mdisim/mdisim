-- ANGEL D.C. - Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2) DEFAULT 0,
  location VARCHAR(255),
  client_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BOQ ITEMS (Bill of Quantities)
-- ============================================
CREATE TABLE IF NOT EXISTS boq_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 0,
  unit_rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  category VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTRACTORS
-- ============================================
CREATE TABLE IF NOT EXISTS contractors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  specialty VARCHAR(255),
  license_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COST ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS cost_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(100) NOT NULL,
  invoice_number VARCHAR(100),
  vendor VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTRACTOR PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(100),
  reference_number VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_payments ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- BOQ Items (access via project ownership)
CREATE POLICY "Users can view BOQ items" ON boq_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = boq_items.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create BOQ items" ON boq_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = boq_items.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update BOQ items" ON boq_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = boq_items.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete BOQ items" ON boq_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = boq_items.project_id AND projects.user_id = auth.uid()));

-- Contractors
CREATE POLICY "Users can view own contractors" ON contractors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contractors" ON contractors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contractors" ON contractors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contractors" ON contractors FOR DELETE USING (auth.uid() = user_id);

-- Cost Entries
CREATE POLICY "Users can view cost entries" ON cost_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create cost entries" ON cost_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update cost entries" ON cost_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete cost entries" ON cost_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid()));

-- Contractor Payments
CREATE POLICY "Users can view contractor payments" ON contractor_payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = contractor_payments.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create contractor payments" ON contractor_payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = contractor_payments.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update contractor payments" ON contractor_payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = contractor_payments.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete contractor payments" ON contractor_payments FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = contractor_payments.project_id AND projects.user_id = auth.uid()));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_boq_items_project_id ON boq_items(project_id);
CREATE INDEX idx_cost_entries_project_id ON cost_entries(project_id);
CREATE INDEX idx_cost_entries_status ON cost_entries(status);
CREATE INDEX idx_contractors_user_id ON contractors(user_id);
CREATE INDEX idx_contractor_payments_project_id ON contractor_payments(project_id);
CREATE INDEX idx_contractor_payments_contractor_id ON contractor_payments(contractor_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER boq_items_updated_at BEFORE UPDATE ON boq_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cost_entries_updated_at BEFORE UPDATE ON cost_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contractor_payments_updated_at BEFORE UPDATE ON contractor_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
