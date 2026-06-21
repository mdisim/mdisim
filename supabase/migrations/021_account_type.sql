-- Add account_type column to profiles for role-based onboarding
-- Values: 'student', 'engineer', 'company'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text
  CHECK (account_type IN ('student', 'engineer', 'company'));

-- Index for filtering by account type
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
