-- ============================================
-- MIGRATION 003: Backfill companies & profiles for existing users
-- ============================================
-- Run this in Supabase SQL Editor after running 002_companies_profiles.sql
-- Safe to run multiple times (all operations are idempotent)
-- ============================================

-- STEP 1: Add company_id column to projects if it doesn't already exist
-- (Your live DB already has it; this is safe to re-run)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- STEP 2: Backfill — create a company + profile for every auth user that doesn't have one
DO $$
DECLARE
  u RECORD;
  existing_company_id UUID;
  new_company_id UUID;
  domain TEXT;
  company_name TEXT;
BEGIN
  FOR u IN SELECT id, email, created_at FROM auth.users LOOP

    -- Check if this user already has a profile with a company_id
    SELECT p.company_id INTO existing_company_id
    FROM profiles p
    WHERE p.id = u.id AND p.company_id IS NOT NULL
    LIMIT 1;

    IF existing_company_id IS NULL THEN
      -- Derive a company name from the email domain
      domain      := split_part(u.email, '@', 2);
      company_name := initcap(split_part(domain, '.', 1)) || ' Construction';

      -- Create the company
      INSERT INTO companies (name)
      VALUES (company_name)
      RETURNING id INTO new_company_id;

      -- Upsert the profile (create if missing, update company_id if null)
      INSERT INTO profiles (id, company_id, role)
      VALUES (u.id, new_company_id, 'owner')
      ON CONFLICT (id) DO UPDATE
        SET company_id = EXCLUDED.company_id
        WHERE profiles.company_id IS NULL;

      RAISE NOTICE 'Created company "%" for user %', company_name, u.email;
    ELSE
      RAISE NOTICE 'User % already has company_id %', u.email, existing_company_id;
    END IF;

  END LOOP;
END;
$$;

-- STEP 3: Backfill existing projects that have NULL company_id
-- Links them to the owner's company
UPDATE projects p
SET company_id = pr.company_id
FROM profiles pr
WHERE pr.id = p.created_by
  AND p.company_id IS NULL
  AND pr.company_id IS NOT NULL;

-- STEP 4: Verify — show counts of all key tables
SELECT
  (SELECT COUNT(*) FROM companies)                               AS companies,
  (SELECT COUNT(*) FROM profiles)                               AS profiles,
  (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL)  AS profiles_with_company,
  (SELECT COUNT(*) FROM projects)                               AS projects,
  (SELECT COUNT(*) FROM projects WHERE company_id IS NOT NULL)  AS projects_with_company,
  (SELECT COUNT(*) FROM projects WHERE company_id IS NULL)      AS projects_missing_company;

-- STEP 5: Verify RLS — confirm policies exist on key tables
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('companies', 'profiles', 'projects', 'boq_items', 'contractors')
ORDER BY tablename, policyname;
