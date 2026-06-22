-- ============================================================
-- 204: qb_library_categories + qb_library_items
-- ============================================================
-- Two-level editable pricing library per user.
--
--   Category (e.g. "Concrete Works", "Earthworks")
--     └── Item (e.g. "Plain concrete C20", rate = 85.00/m³)
--
-- Users build their own rate book. Items can be applied to
-- BOQ rows. Supports import/export via Excel.
-- ============================================================

-- ── Categories ──────────────────────────────────────────────

CREATE TABLE qb_library_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_libcat_user ON qb_library_categories(user_id);

ALTER TABLE qb_library_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON qb_library_categories
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_qb_libcat_updated
  BEFORE UPDATE ON qb_library_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Items ───────────────────────────────────────────────────

CREATE TABLE qb_library_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES qb_library_categories(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code            VARCHAR(50),
  description     TEXT NOT NULL,
  unit            VARCHAR(30) NOT NULL DEFAULT 'm',
  default_rate    NUMERIC(15,4) NOT NULL DEFAULT 0,
  material_rate   NUMERIC(15,4),
  labor_rate      NUMERIC(15,4),
  equipment_rate  NUMERIC(15,4),
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_libitem_cat  ON qb_library_items(category_id);
CREATE INDEX idx_qb_libitem_user ON qb_library_items(user_id);
CREATE INDEX idx_qb_libitem_code ON qb_library_items(code);

ALTER TABLE qb_library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON qb_library_items
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_qb_libitem_updated
  BEFORE UPDATE ON qb_library_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
