-- Lifetime plans + custom duration (duration_days nullable when not lifetime)

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE subscription_plans
  ALTER COLUMN duration_days DROP NOT NULL;

ALTER TABLE subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_duration_days_check;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_duration_check CHECK (
    (is_lifetime = true AND duration_days IS NULL)
    OR (is_lifetime = false AND duration_days IS NOT NULL AND duration_days > 0)
  );

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION has_active_subscription(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions
    WHERE user_id = uid
      AND status = 'active'
      AND (is_lifetime = true OR expires_at > now())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
