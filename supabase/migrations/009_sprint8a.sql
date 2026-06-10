-- Sprint 8A: RBAC, audit logs, team invitations

-- Add role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'viewer';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','company_admin','project_manager','quantity_surveyor','site_engineer','viewer'));

-- Role permissions reference table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  UNIQUE(role, resource, action)
);

-- Seed default permissions
INSERT INTO role_permissions (role, resource, action) VALUES
  -- super_admin: all
  ('super_admin','*','*'),
  -- company_admin: all within company
  ('company_admin','projects','create'),('company_admin','projects','read'),('company_admin','projects','update'),('company_admin','projects','delete'),
  ('company_admin','boq','create'),('company_admin','boq','read'),('company_admin','boq','update'),('company_admin','boq','delete'),
  ('company_admin','costs','create'),('company_admin','costs','read'),('company_admin','costs','update'),('company_admin','costs','delete'),
  ('company_admin','contractors','create'),('company_admin','contractors','read'),('company_admin','contractors','update'),('company_admin','contractors','delete'),
  ('company_admin','tenders','create'),('company_admin','tenders','read'),('company_admin','tenders','update'),('company_admin','tenders','delete'),
  ('company_admin','settings','read'),('company_admin','settings','update'),
  ('company_admin','team','create'),('company_admin','team','read'),('company_admin','team','update'),('company_admin','team','delete'),
  -- project_manager
  ('project_manager','projects','create'),('project_manager','projects','read'),('project_manager','projects','update'),
  ('project_manager','boq','create'),('project_manager','boq','read'),('project_manager','boq','update'),
  ('project_manager','costs','create'),('project_manager','costs','read'),('project_manager','costs','update'),
  ('project_manager','contractors','read'),('project_manager','contractors','update'),
  ('project_manager','tenders','read'),
  -- quantity_surveyor
  ('quantity_surveyor','projects','read'),
  ('quantity_surveyor','boq','create'),('quantity_surveyor','boq','read'),('quantity_surveyor','boq','update'),('quantity_surveyor','boq','delete'),
  ('quantity_surveyor','costs','create'),('quantity_surveyor','costs','read'),('quantity_surveyor','costs','update'),
  ('quantity_surveyor','contractors','read'),
  -- site_engineer
  ('site_engineer','projects','read'),
  ('site_engineer','boq','read'),
  ('site_engineer','costs','create'),('site_engineer','costs','read'),
  ('site_engineer','reports','create'),('site_engineer','reports','read'),('site_engineer','reports','update'),
  -- viewer: read only
  ('viewer','projects','read'),('viewer','boq','read'),('viewer','costs','read'),('viewer','contractors','read'),('viewer','reports','read')
ON CONFLICT DO NOTHING;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  resource_name text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view own audit logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.id = auth.uid() AND p2.id = audit_logs.user_id
        AND p1.role IN ('super_admin','company_admin')
    )
  );
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text DEFAULT 'pending',
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins manage invitations" ON team_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.company_id = team_invitations.company_id
        AND profiles.id = auth.uid() AND profiles.role IN ('super_admin','company_admin')
    )
  );
