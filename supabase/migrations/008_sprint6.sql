-- Sprint 6: Risk Register, Issues Register, Meeting Minutes, Material Approvals

-- ============================================
-- PROJECT RISKS
-- ============================================
CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  probability text DEFAULT 'medium',
  impact text DEFAULT 'medium',
  risk_score int GENERATED ALWAYS AS (
    CASE probability WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 2 END *
    CASE impact WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 2 END
  ) STORED,
  mitigation text,
  owner text,
  status text DEFAULT 'open',
  due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage project risks" ON project_risks
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_risks.project_id AND projects.created_by = auth.uid()));

-- ============================================
-- PROJECT ISSUES
-- ============================================
CREATE TABLE IF NOT EXISTS project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_number text NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  raised_by text,
  assigned_to text,
  due_date date,
  resolved_date date,
  resolution_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage project issues" ON project_issues
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_issues.project_id AND projects.created_by = auth.uid()));

-- ============================================
-- MEETING MINUTES
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  meeting_type text DEFAULT 'progress',
  location text,
  attendees text,
  agenda text,
  minutes text,
  action_items text,
  next_meeting_date date,
  chaired_by text,
  status text DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage meeting minutes" ON meeting_minutes
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = meeting_minutes.project_id AND projects.created_by = auth.uid()));

-- ============================================
-- MATERIAL APPROVALS (ALTER)
-- ============================================
ALTER TABLE material_deliveries ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE material_deliveries ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE material_deliveries ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE material_deliveries ADD COLUMN IF NOT EXISTS rejection_reason text;
