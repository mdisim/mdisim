-- ============================================================
-- 200: qb_projects — Core project table for the rebuild
-- ============================================================
-- Uses "qb_" prefix so existing production "projects" table
-- is untouched. Can be renamed later after full migration.
-- ============================================================

CREATE TABLE qb_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  client_name TEXT,
  location    TEXT,
  currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
  vat_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_qb_projects_user ON qb_projects(user_id);

-- RLS
ALTER TABLE qb_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON qb_projects
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qb_projects_updated
  BEFORE UPDATE ON qb_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
