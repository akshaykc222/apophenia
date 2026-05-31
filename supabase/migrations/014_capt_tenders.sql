-- External tenders synced from CAPT (Central Agency for Public Tenders)

CREATE TYPE capt_tender_status AS ENUM ('open', 'expired');

CREATE TABLE capt_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  ministry_name TEXT,
  tender_type TEXT,
  published_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  detail_url TEXT,
  status capt_tender_status NOT NULL DEFAULT 'open',
  is_latest BOOLEAN NOT NULL DEFAULT true,
  raw_data JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT capt_tenders_external_ref_key UNIQUE (external_ref)
);

CREATE INDEX capt_tenders_status_latest_idx
  ON capt_tenders (status, is_latest, deadline_at DESC);
CREATE INDEX capt_tenders_last_seen_idx ON capt_tenders (last_seen_at DESC);

CREATE TRIGGER capt_tenders_updated_at BEFORE UPDATE ON capt_tenders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE capt_tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY capt_tenders_admin ON capt_tenders
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY capt_tenders_app_read ON capt_tenders
  FOR SELECT TO authenticated
  USING (status = 'open');

-- Gazette tenders: track latest batch + expiry
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS tender_status TEXT
  CHECK (tender_status IS NULL OR tender_status IN ('open', 'expired'));

CREATE INDEX IF NOT EXISTS content_items_tender_status_idx
  ON content_items (content_type, tender_status, is_latest)
  WHERE content_type = 'tender';
