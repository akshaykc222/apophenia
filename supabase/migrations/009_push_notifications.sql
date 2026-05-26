-- Firebase push: device tokens + in-app inbox + admin campaign log

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);
CREATE INDEX device_tokens_token_idx ON device_tokens (fcm_token);

CREATE TABLE push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'selected')),
  target_user_ids UUID[] NOT NULL DEFAULT '{}',
  sent_by UUID REFERENCES auth.users(id),
  devices_targeted INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES push_campaigns(id) ON DELETE SET NULL,
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_notifications_user_idx ON user_notifications (user_id, created_at DESC);

CREATE TRIGGER device_tokens_updated_at BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- App users manage their own FCM tokens
CREATE POLICY device_tokens_own ON device_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- In-app inbox: users read/update own
CREATE POLICY user_notifications_select ON user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_notifications_update ON user_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin full access (send API uses service role for insert)
CREATE POLICY push_campaigns_admin ON push_campaigns
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY user_notifications_admin ON user_notifications
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- FCM topic for broadcast: kuwait_today_all (subscribed from Flutter)
