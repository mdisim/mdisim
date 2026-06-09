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

-- ============================================
-- PHASE 2: SITE DAILY REPORTS (SDR)
-- ============================================

CREATE TABLE IF NOT EXISTS site_daily_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  weather VARCHAR(50) CHECK (weather IN ('sunny', 'partly_cloudy', 'cloudy', 'rainy', 'stormy', 'foggy')),
  temperature_high DECIMAL(5,1),
  temperature_low DECIMAL(5,1),
  work_status VARCHAR(50) DEFAULT 'normal' CHECK (work_status IN ('normal', 'delayed', 'suspended', 'holiday')),
  delay_reason TEXT,
  general_notes TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, report_date)
);

CREATE TABLE IF NOT EXISTS sdr_workforce (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  trade VARCHAR(100) NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  planned_count INTEGER DEFAULT 0,
  actual_count INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sdr_equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  equipment_name VARCHAR(100) NOT NULL,
  equipment_type VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  hours_used DECIMAL(6,2) DEFAULT 0,
  idle_hours DECIMAL(6,2) DEFAULT 0,
  operator_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sdr_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location_on_site VARCHAR(255),
  unit VARCHAR(50),
  quantity_done DECIMAL(15,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sdr_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES site_daily_reports(id) ON DELETE CASCADE NOT NULL,
  issue_type VARCHAR(50) CHECK (issue_type IN ('safety', 'quality', 'delay', 'rfi', 'instruction', 'other')),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  raised_by VARCHAR(100),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for SDR tables
ALTER TABLE site_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_workforce ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project reports" ON site_daily_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = site_daily_reports.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users manage sdr_workforce" ON sdr_workforce
  FOR ALL USING (EXISTS (SELECT 1 FROM site_daily_reports sdr JOIN projects p ON p.id = sdr.project_id WHERE sdr.id = sdr_workforce.report_id AND p.user_id = auth.uid()));

CREATE POLICY "Users manage sdr_equipment" ON sdr_equipment
  FOR ALL USING (EXISTS (SELECT 1 FROM site_daily_reports sdr JOIN projects p ON p.id = sdr.project_id WHERE sdr.id = sdr_equipment.report_id AND p.user_id = auth.uid()));

CREATE POLICY "Users manage sdr_activities" ON sdr_activities
  FOR ALL USING (EXISTS (SELECT 1 FROM site_daily_reports sdr JOIN projects p ON p.id = sdr.project_id WHERE sdr.id = sdr_activities.report_id AND p.user_id = auth.uid()));

CREATE POLICY "Users manage sdr_issues" ON sdr_issues
  FOR ALL USING (EXISTS (SELECT 1 FROM site_daily_reports sdr JOIN projects p ON p.id = sdr.project_id WHERE sdr.id = sdr_issues.report_id AND p.user_id = auth.uid()));

CREATE INDEX idx_sdr_project_id ON site_daily_reports(project_id);
CREATE INDEX idx_sdr_report_date ON site_daily_reports(report_date);
CREATE INDEX idx_sdr_workforce_report ON sdr_workforce(report_id);
CREATE INDEX idx_sdr_equipment_report ON sdr_equipment(report_id);
CREATE INDEX idx_sdr_activities_report ON sdr_activities(report_id);
CREATE INDEX idx_sdr_issues_report ON sdr_issues(report_id);

CREATE TRIGGER sdr_updated_at BEFORE UPDATE ON site_daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PHASE 2 SPRINT 2: QUANTITY TAKEOFF SYSTEM
-- ============================================

-- Uploaded drawing files (PDFs)
CREATE TABLE IF NOT EXISTS drawing_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  page_count INTEGER DEFAULT 1,
  status VARCHAR(30) DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scale calibrations per drawing page
CREATE TABLE IF NOT EXISTS drawing_calibrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  drawing_id UUID REFERENCES drawing_files(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER DEFAULT 1 NOT NULL,
  pixels_distance DECIMAL(12,4) NOT NULL,
  real_distance DECIMAL(12,4) NOT NULL,
  real_unit VARCHAR(20) DEFAULT 'm',
  scale_factor DECIMAL(16,8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(drawing_id, page_number)
);

-- Individual measurements on drawings
CREATE TABLE IF NOT EXISTS drawing_measurements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  drawing_id UUID REFERENCES drawing_files(id) ON DELETE CASCADE NOT NULL,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  page_number INTEGER DEFAULT 1 NOT NULL,
  label VARCHAR(255),
  measurement_type VARCHAR(20) NOT NULL CHECK (measurement_type IN ('length', 'area', 'rectangle', 'count', 'highlight', 'text')),
  points JSONB NOT NULL,
  color VARCHAR(20) DEFAULT '#f59e0b',
  real_value DECIMAL(15,4),
  unit VARCHAR(20),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE drawing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drawing files" ON drawing_files
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = drawing_files.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users manage calibrations" ON drawing_calibrations
  FOR ALL USING (EXISTS (SELECT 1 FROM drawing_files df JOIN projects p ON p.id = df.project_id WHERE df.id = drawing_calibrations.drawing_id AND p.user_id = auth.uid()));

CREATE POLICY "Users manage measurements" ON drawing_measurements
  FOR ALL USING (EXISTS (SELECT 1 FROM drawing_files df JOIN projects p ON p.id = df.project_id WHERE df.id = drawing_measurements.drawing_id AND p.user_id = auth.uid()));

CREATE INDEX idx_drawing_files_project ON drawing_files(project_id);
CREATE INDEX idx_drawing_calibrations_drawing ON drawing_calibrations(drawing_id);
CREATE INDEX idx_drawing_measurements_drawing ON drawing_measurements(drawing_id);
CREATE INDEX idx_drawing_measurements_boq ON drawing_measurements(boq_item_id);

CREATE TRIGGER drawing_files_updated_at BEFORE UPDATE ON drawing_files FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER drawing_calibrations_updated_at BEFORE UPDATE ON drawing_calibrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER drawing_measurements_updated_at BEFORE UPDATE ON drawing_measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Supabase Storage Bucket (run separately or via dashboard):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', false);

-- ============================================
-- PHASE 2 SPRINT 2 ENHANCEMENTS
-- ============================================

-- Drawing layers (structural, architectural, MEP, civil, etc.)
CREATE TABLE IF NOT EXISTS drawing_layers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  drawing_id UUID REFERENCES drawing_files(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  discipline VARCHAR(50) DEFAULT 'general',
  color VARCHAR(20) DEFAULT '#6366f1',
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add layer_id to measurements
ALTER TABLE drawing_measurements ADD COLUMN IF NOT EXISTS layer_id UUID REFERENCES drawing_layers(id) ON DELETE SET NULL;

-- Measurement history (track every edit)
CREATE TABLE IF NOT EXISTS measurement_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  measurement_id UUID REFERENCES drawing_measurements(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('created', 'updated', 'linked', 'unlinked')),
  previous_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE drawing_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage layers" ON drawing_layers
  FOR ALL USING (EXISTS (SELECT 1 FROM drawing_files df JOIN projects p ON p.id = df.project_id WHERE df.id = drawing_layers.drawing_id AND p.user_id = auth.uid()));

CREATE POLICY "Users view measurement history" ON measurement_history
  FOR ALL USING (EXISTS (SELECT 1 FROM drawing_measurements dm JOIN drawing_files df ON df.id = dm.drawing_id JOIN projects p ON p.id = df.project_id WHERE dm.id = measurement_history.measurement_id AND p.user_id = auth.uid()));

CREATE INDEX idx_drawing_layers_drawing ON drawing_layers(drawing_id);
CREATE INDEX idx_measurement_history_measurement ON measurement_history(measurement_id);
CREATE INDEX idx_measurement_history_changed_at ON measurement_history(changed_at);
