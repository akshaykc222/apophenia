-- Admin-editable mobile AI assistant (Flutter /api/mobile-chat)

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS mobile_chat_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mobile_chat_system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS mobile_chat_out_of_scope_reply TEXT,
  ADD COLUMN IF NOT EXISTS mobile_chat_developer_reply TEXT,
  ADD COLUMN IF NOT EXISTS mobile_chat_temperature REAL NOT NULL DEFAULT 0.6
    CHECK (mobile_chat_temperature >= 0 AND mobile_chat_temperature <= 2),
  ADD COLUMN IF NOT EXISTS mobile_chat_max_tokens INT NOT NULL DEFAULT 700
    CHECK (mobile_chat_max_tokens >= 100 AND mobile_chat_max_tokens <= 2000);

COMMENT ON COLUMN app_settings.mobile_chat_system_prompt IS
  'Full system prompt override for mobile assistant; NULL = built-in default in code';
COMMENT ON COLUMN app_settings.mobile_chat_out_of_scope_reply IS
  'Funny refusal for off-topic / information-source questions; NULL = default';
COMMENT ON COLUMN app_settings.mobile_chat_developer_reply IS
  'Answer when asked who developed the bot; NULL = alfaresi solutions';
