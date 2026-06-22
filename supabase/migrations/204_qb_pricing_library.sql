-- ============================================================
-- 204: qb_pricing_library — Editable per-user rate book
-- ============================================================
-- Users maintain their own pricing library. Rates can be
-- applied to BOQ items. Fully editable, importable/exportable.
-- ============================================================

CREATE TABLE qb_pricing_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code            VARCHAR(50),
  category        TEXT,
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
  default_rate    NUMERIC(15,4) NOT NULL DEFAULT 0,
  material_rate   NUMERIC(15,4),
  labor_rate      NUMERIC(15,4),
  equipment_rate  NUMERIC(15,4),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_pricing_user     ON qb_pricing_library(user_id);
CREATE INDEX idx_qb_pricing_category ON qb_pricing_library(category);
CREATE INDEX idx_qb_pricing_code     ON qb_pricing_library(code);

ALTER TABLE qb_pricing_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON qb_pricing_library
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_qb_pricing_updated
  BEFORE UPDATE ON qb_pricing_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
