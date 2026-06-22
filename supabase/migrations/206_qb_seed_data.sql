-- ============================================================
-- 206: Seed data for development / demo
-- ============================================================
-- Inserts sample data for the authenticated user.
-- Uses a DO block so it works with any auth.uid().
-- Run AFTER signing in — the seed references the calling user.
-- ============================================================

-- Helper: insert seed only if qb_projects is empty for the user
DO $$
DECLARE
  uid UUID := auth.uid();
  proj_id UUID;
  proj2_id UUID;
  cat_concrete UUID;
  cat_earth UUID;
  cat_steel UUID;
  lib_pc20 UUID;
  lib_rc30 UUID;
  lib_fwk UUID;
  lib_exc UUID;
  lib_bfill UUID;
  lib_rebar UUID;
  mi_found UUID;
  mi_col UUID;
  mi_slab UUID;
  mi_exc UUID;
BEGIN
  -- Skip if user already has projects
  IF EXISTS (SELECT 1 FROM qb_projects WHERE user_id = uid) THEN
    RAISE NOTICE 'Seed skipped — user already has projects';
    RETURN;
  END IF;

  -- ── Project 1: Villa Construction ─────────────────────────
  INSERT INTO qb_projects (id, user_id, name, client_name, location, currency, vat_pct, notes)
  VALUES (gen_random_uuid(), uid,
    'Villa Al-Noor Construction', 'Ahmad Khalil', 'Ramallah, Palestine',
    'NIS', 17.00, 'Three-story residential villa with basement')
  RETURNING id INTO proj_id;

  -- ── Project 2: Office Renovation ──────────────────────────
  INSERT INTO qb_projects (id, user_id, name, client_name, location, currency, vat_pct, notes)
  VALUES (gen_random_uuid(), uid,
    'Downtown Office Renovation', 'Beta Corp Ltd.', 'Jerusalem',
    'USD', 0, 'Interior renovation — 2 floors, 800 m²')
  RETURNING id INTO proj2_id;

  -- ── Library: Categories ───────────────────────────────────
  INSERT INTO qb_library_categories (id, user_id, name, description, sort_order)
  VALUES (gen_random_uuid(), uid, 'Concrete Works', 'All concrete and formwork items', 1)
  RETURNING id INTO cat_concrete;

  INSERT INTO qb_library_categories (id, user_id, name, description, sort_order)
  VALUES (gen_random_uuid(), uid, 'Earthworks', 'Excavation, backfill, compaction', 2)
  RETURNING id INTO cat_earth;

  INSERT INTO qb_library_categories (id, user_id, name, description, sort_order)
  VALUES (gen_random_uuid(), uid, 'Steelwork', 'Reinforcement and structural steel', 3)
  RETURNING id INTO cat_steel;

  -- ── Library: Items ────────────────────────────────────────
  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_concrete, uid, 'CON-001', 'Plain concrete C20', 'm³', 450.00, 320.00, 100.00, 30.00, 1)
  RETURNING id INTO lib_pc20;

  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_concrete, uid, 'CON-002', 'Reinforced concrete C30', 'm³', 650.00, 450.00, 150.00, 50.00, 2)
  RETURNING id INTO lib_rc30;

  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_concrete, uid, 'CON-003', 'Formwork — flat surfaces', 'm²', 85.00, 45.00, 35.00, 5.00, 3)
  RETURNING id INTO lib_fwk;

  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_earth, uid, 'EW-001', 'Bulk excavation', 'm³', 35.00, 0, 15.00, 20.00, 1)
  RETURNING id INTO lib_exc;

  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_earth, uid, 'EW-002', 'Backfill with compaction', 'm³', 28.00, 8.00, 10.00, 10.00, 2)
  RETURNING id INTO lib_bfill;

  INSERT INTO qb_library_items (id, category_id, user_id, code, description, unit, default_rate, material_rate, labor_rate, equipment_rate, sort_order)
  VALUES
    (gen_random_uuid(), cat_steel, uid, 'ST-001', 'Rebar T16 supply & fix', 'ton', 4200.00, 3200.00, 800.00, 200.00, 1)
  RETURNING id INTO lib_rebar;

  -- ── Measurement Items (Project 1) ────────────────────────
  INSERT INTO qb_measurement_items (id, project_id, item_code, description, unit, measurement_type, section, location, sort_order, created_by)
  VALUES (gen_random_uuid(), proj_id, 'FND-001', 'Foundation concrete C30', 'm³', 'volume', 'Substructure', 'Basement', 1, uid)
  RETURNING id INTO mi_found;

  INSERT INTO qb_measurement_items (id, project_id, item_code, description, unit, measurement_type, section, location, sort_order, created_by)
  VALUES (gen_random_uuid(), proj_id, 'COL-001', 'Ground floor columns', 'm³', 'volume', 'Superstructure', 'Ground Floor', 2, uid)
  RETURNING id INTO mi_col;

  INSERT INTO qb_measurement_items (id, project_id, item_code, description, unit, measurement_type, section, location, sort_order, created_by)
  VALUES (gen_random_uuid(), proj_id, 'SLB-001', 'First floor slab', 'm³', 'volume', 'Superstructure', 'First Floor', 3, uid)
  RETURNING id INTO mi_slab;

  INSERT INTO qb_measurement_items (id, project_id, item_code, description, unit, measurement_type, section, location, sort_order, created_by)
  VALUES (gen_random_uuid(), proj_id, 'EXC-001', 'Foundation excavation', 'm³', 'volume', 'Substructure', 'Basement', 4, uid)
  RETURNING id INTO mi_exc;

  -- ── Measurement Lines ─────────────────────────────────────

  -- Foundation concrete: 3 strips
  INSERT INTO qb_measurement_lines (item_id, line_number, description, nr, length, width, height, is_deduction, quantity, sort_order)
  VALUES
    (mi_found, 1, 'Strip footing A-A', 1, 12.50, 0.80, 0.50, false, 5.00, 1),
    (mi_found, 2, 'Strip footing B-B', 1, 10.20, 0.80, 0.50, false, 4.08, 2),
    (mi_found, 3, 'Strip footing C-C', 2, 8.00, 0.60, 0.50, false, 4.80, 3),
    (mi_found, 4, 'Deduct pipe opening', 1, 0.30, 0.30, 0.50, true, -0.045, 4);

  -- Columns: 8 identical columns
  INSERT INTO qb_measurement_lines (item_id, line_number, description, nr, length, width, height, is_deduction, quantity, sort_order)
  VALUES
    (mi_col, 1, 'Columns 300×300 h=3.2m', 8, 0.30, 0.30, 3.20, false, 2.304, 1);

  -- Slab
  INSERT INTO qb_measurement_lines (item_id, line_number, description, nr, length, width, height, is_deduction, quantity, sort_order)
  VALUES
    (mi_slab, 1, 'Main slab area', 1, 14.00, 10.00, 0.20, false, 28.00, 1),
    (mi_slab, 2, 'Deduct stairwell opening', 1, 3.00, 1.20, 0.20, true, -0.72, 2);

  -- Excavation with formula override
  INSERT INTO qb_measurement_lines (item_id, line_number, description, nr, length, width, height, is_deduction, quantity, formula, sort_order)
  VALUES
    (mi_exc, 1, 'General excavation', 1, 16.00, 12.00, 1.50, false, 288.00, NULL, 1),
    (mi_exc, 2, 'Extra depth at lift pit', 1, NULL, NULL, NULL, false, 4.50, '2.5 * 1.8 * 1.0', 2);

  -- ── BOQ Items ─────────────────────────────────────────────
  INSERT INTO qb_boq_items (project_id, mi_id, library_item_id, code, description, unit, quantity, original_quantity, unit_rate, material_rate, labor_rate, equipment_rate, section, sort_order)
  VALUES
    (proj_id, mi_found, lib_rc30, 'FND-001', 'Foundation concrete C30', 'm³', 13.835, 13.835, 650.00, 450.00, 150.00, 50.00, 'Substructure', 1),
    (proj_id, mi_col, lib_rc30, 'COL-001', 'Ground floor columns C30', 'm³', 2.304, 2.304, 650.00, 450.00, 150.00, 50.00, 'Superstructure', 2),
    (proj_id, mi_slab, lib_rc30, 'SLB-001', 'First floor slab C30', 'm³', 27.28, 27.28, 650.00, 450.00, 150.00, 50.00, 'Superstructure', 3),
    (proj_id, mi_exc, lib_exc, 'EXC-001', 'Foundation excavation', 'm³', 292.50, 292.50, 35.00, 0, 15.00, 20.00, 'Substructure', 4),
    (proj_id, NULL, lib_fwk, 'FWK-001', 'Formwork to foundations', 'm²', 45.60, 45.60, 85.00, 45.00, 35.00, 5.00, 'Substructure', 5),
    (proj_id, NULL, lib_bfill, 'BF-001', 'Backfill around foundations', 'm³', 120.00, 120.00, 28.00, 8.00, 10.00, 10.00, 'Substructure', 6);

END;
$$;
