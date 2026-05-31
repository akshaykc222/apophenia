-- Subscription billing (MyFatoorah one-time plans)

CREATE TYPE payment_transaction_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'expired'
);

CREATE TYPE user_subscription_status AS ENUM (
  'active',
  'expired',
  'cancelled'
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  price_kwd NUMERIC(10, 3) NOT NULL CHECK (price_kwd > 0),
  duration_days INT NOT NULL CHECK (duration_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status payment_transaction_status NOT NULL DEFAULT 'pending',
  amount_kwd NUMERIC(10, 3) NOT NULL,
  invoice_id TEXT,
  payment_id TEXT,
  mf_reference TEXT,
  customer_reference TEXT,
  session_id TEXT,
  payment_url TEXT,
  raw_webhook JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_transactions_invoice_id_uidx
  ON payment_transactions (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX payment_transactions_user_idx ON payment_transactions (user_id, created_at DESC);
CREATE INDEX payment_transactions_status_idx ON payment_transactions (status, created_at DESC);

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  status user_subscription_status NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_subscriptions_user_idx ON user_subscriptions (user_id, expires_at DESC);
CREATE INDEX user_subscriptions_active_idx ON user_subscriptions (status, expires_at)
  WHERE status = 'active';

CREATE TRIGGER subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Active subscription check (used by RLS)
CREATE OR REPLACE FUNCTION has_active_subscription(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions
    WHERE user_id = uid
      AND status = 'active'
      AND expires_at > now()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans: app users read active; admin full access
CREATE POLICY subscription_plans_admin ON subscription_plans
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY subscription_plans_app_read ON subscription_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY subscription_plans_anon_read ON subscription_plans
  FOR SELECT TO anon
  USING (is_active = true);

-- Transactions: own read; admin full
CREATE POLICY payment_transactions_admin ON payment_transactions
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY payment_transactions_own_read ON payment_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions: own read; admin full
CREATE POLICY user_subscriptions_admin ON user_subscriptions
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY user_subscriptions_own_read ON user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Gate published content behind active subscription
DROP POLICY IF EXISTS content_items_public_read ON content_items;

CREATE POLICY content_items_subscriber_read ON content_items
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND has_active_subscription(auth.uid())
  );

-- Seed default plans (optional starter rows)
INSERT INTO subscription_plans (name_ar, name_en, description_ar, price_kwd, duration_days, sort_order, features)
VALUES
  (
    'اشتراك 3 أشهر',
    '3 Months',
    'وصول كامل لتطبيق كويت اليوم لمدة 90 يوماً',
    15.000,
    90,
    1,
    '["وصول كامل للمحتوى", "المساعد الذكي", "الإشعارات"]'::jsonb
  ),
  (
    'اشتراك سنة',
    '1 Year',
    'وصول كامل لتطبيق كويت اليوم لمدة 365 يوماً',
    45.000,
    365,
    2,
    '["وصول كامل للمحتوى", "المساعد الذكي", "الإشعارات", "أفضل قيمة"]'::jsonb
  );
