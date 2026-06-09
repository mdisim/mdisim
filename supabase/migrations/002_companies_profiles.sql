-- ============================================
-- MIGRATION 002: Companies & Profiles
-- ============================================
-- Run this in your Supabase SQL editor BEFORE using the app.
-- This fixes the "null value in column company_id" error on project inserts.
--
-- INSTRUCTIONS:
--   1. Go to https://supabase.com/dashboard → your project → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. Re-deploy your app (or redeploy on Vercel)
-- ============================================

-- Companies (auto-created on first login)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'My Company',
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles (links auth.users to companies)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name VARCHAR(255),
  role VARCHAR(100) DEFAULT 'owner',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company" ON companies
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.company_id = companies.id AND profiles.id = auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add company_id to projects table if not already present
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
