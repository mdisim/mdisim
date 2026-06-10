-- Sprint 8B Migration

-- Company enhancements
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

-- Project Correspondence
CREATE TABLE IF NOT EXISTS project_correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reference_number text NOT NULL,
  subject text NOT NULL,
  direction text NOT NULL DEFAULT 'outgoing',
  correspondent text,
  letter_date date,
  received_date date,
  category text DEFAULT 'general',
  status text DEFAULT 'open',
  summary text,
  action_required text,
  due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE project_correspondence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage project correspondence" ON project_correspondence;
CREATE POLICY "Users manage project correspondence" ON project_correspondence
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_correspondence.project_id AND projects.created_by = auth.uid()));

-- Document Revisions
CREATE TABLE IF NOT EXISTS document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  revision text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  reviewed_by text,
  approved_by text,
  approved_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage document revisions" ON document_revisions;
CREATE POLICY "Users manage document revisions" ON document_revisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_documents pd
      JOIN projects p ON p.id = pd.project_id
      WHERE pd.id = document_revisions.document_id AND p.created_by = auth.uid()
    )
  );
