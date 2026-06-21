-- 022: Learning system, subscriptions, and payment tables

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Learning System Tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- course_progress
CREATE TABLE IF NOT EXISTS course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  lesson_number integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_slug, lesson_number)
);

-- quiz_attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  lesson_number integer NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  answers jsonb NOT NULL DEFAULT '{}',
  passed boolean NOT NULL DEFAULT false,
  attempted_at timestamptz DEFAULT now()
);

-- certificates
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz DEFAULT now(),
  full_name text,
  UNIQUE(user_id, course_slug)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Subscription Tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month',
  features jsonb NOT NULL DEFAULT '[]',
  max_projects integer,
  max_team_members integer,
  created_at timestamptz DEFAULT now()
);

-- user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id text REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- payment_history
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'succeeded',
  description text,
  stripe_payment_id text,
  paid_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own course progress" ON course_progress
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own certificates" ON certificates
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read subscription plans" ON subscription_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON user_subscriptions
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own payment history" ON payment_history
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Seed subscription plans
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO subscription_plans (id, name, price_cents, features, max_projects, max_team_members) VALUES
  ('student', 'Student', 900,
   '["10 courses", "Engineering calculators", "Practice exercises", "Certificates", "Sample projects"]',
   NULL, NULL),
  ('engineer', 'Engineer', 2900,
   '["Unlimited courses", "Project management", "BOQ builder", "Rebar calculator", "Drawing management", "PDF/Excel export", "Rate analysis"]',
   50, NULL),
  ('company', 'Company', 9900,
   '["Everything in Engineer", "Team management", "Procurement", "Cost control", "Daily reports", "Tenders", "Client exports", "Role-based access"]',
   NULL, 50)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. updated_at trigger for user_subscriptions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Indexes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
