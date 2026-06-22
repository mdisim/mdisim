-- ============================================
-- MIGRATION 023: Guarantee profile creation on signup
-- ============================================
-- Problem: profiles rows are only created in application code (callback route).
-- If the callback fails or is bypassed, the user exists in auth.users but has
-- no profiles row, breaking the entire app.
--
-- Fix:
-- 1. Add email column to profiles
-- 2. Create a DB trigger on auth.users INSERT that auto-creates a profiles row
-- 3. Ensure RLS allows users to INSERT their own profile (for upsert fallback)
-- 4. Backfill any orphaned auth users who are missing profiles rows
-- ============================================

-- 1. Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure RLS policy covers INSERT for own profile (needed for upsert fallback)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Backfill: create profiles rows for any auth.users missing them
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'role', 'owner')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Backfill email for existing profiles that are missing it
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL AND u.email IS NOT NULL;
