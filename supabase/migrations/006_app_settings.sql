-- Singleton app settings (admin-editable from /settings)

CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pdf_upload_weekday SMALLINT NOT NULL DEFAULT 0
    CHECK (pdf_upload_weekday >= 0 AND pdf_upload_weekday <= 6),
  default_issue_frequency issue_frequency NOT NULL DEFAULT 'weekly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO app_settings (id) VALUES (1);

CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_admin ON app_settings
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
