-- Sprint 3: project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  revision text,
  status text NOT NULL DEFAULT 'current',
  file_url text,
  uploaded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project documents" ON project_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_documents.project_id AND projects.created_by = auth.uid())
  );
