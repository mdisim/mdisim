-- ============================================
-- MIGRATION 004: Fix companies RLS circular dependency
-- ============================================
-- Problem: The "FOR ALL" policy on companies uses USING to check that a
-- profile already references this company. But on INSERT of a brand-new
-- company no profile exists yet → INSERT is silently denied → company_id
-- is never populated → project creation fails with NOT NULL violation.
--
-- Fix: Replace the single FOR ALL policy with separate policies so INSERT
-- only requires the user to be authenticated, while SELECT/UPDATE/DELETE
-- still require the profile → company linkage.
-- ============================================

-- Drop the broken catch-all policy
DROP POLICY IF EXISTS "Users can view own company" ON companies;

-- INSERT: any authenticated user may create a company
CREATE POLICY "Authenticated users can create companies" ON companies
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: only companies linked to your profile
CREATE POLICY "Users can select own company" ON companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.company_id = companies.id
        AND profiles.id = auth.uid()
    )
  );

-- UPDATE: only your own company
CREATE POLICY "Users can update own company" ON companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.company_id = companies.id
        AND profiles.id = auth.uid()
    )
  );

-- DELETE: only your own company
CREATE POLICY "Users can delete own company" ON companies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.company_id = companies.id
        AND profiles.id = auth.uid()
    )
  );

-- Verify the policies look correct
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;
