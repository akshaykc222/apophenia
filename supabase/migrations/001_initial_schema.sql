-- Kuwait Today Admin — initial schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE extraction_status AS ENUM ('pending', 'processing', 'ready', 'failed');
CREATE TYPE draft_status AS ENUM ('suggested', 'accepted', 'rejected');
CREATE TYPE content_type AS ENUM ('article', 'tender', 'decree', 'addendum');
CREATE TYPE issue_frequency AS ENUM ('daily', 'weekly');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Admin users (must be seeded after signup)
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reference data
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  badge_emoji TEXT,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tender_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDF issues (gazette uploads)
CREATE TABLE pdf_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date DATE NOT NULL,
  frequency issue_frequency NOT NULL DEFAULT 'weekly',
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  page_count INT,
  file_size_bytes BIGINT,
  extraction_status extraction_status NOT NULL DEFAULT 'pending',
  extraction_progress INT NOT NULL DEFAULT 0 CHECK (extraction_progress >= 0 AND extraction_progress <= 100),
  error_message TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES pdf_issues(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'pending',
  pages_done INT NOT NULL DEFAULT 0,
  pages_total INT NOT NULL DEFAULT 0,
  last_page_processed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issue_text_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES pdf_issues(id) ON DELETE CASCADE,
  page_start INT NOT NULL,
  page_end INT NOT NULL,
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, page_start, page_end)
);

-- Drafts (pre-publish review)
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES pdf_issues(id) ON DELETE CASCADE,
  content_type content_type NOT NULL DEFAULT 'article',
  category_id UUID REFERENCES categories(id),
  ministry_id UUID REFERENCES ministries(id),
  tender_category_id UUID REFERENCES tender_categories(id),
  title_ar TEXT,
  summary_ar TEXT,
  body_ar TEXT,
  page_start INT,
  page_end INT,
  raw_extracted_text TEXT,
  confidence_score REAL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  status draft_status NOT NULL DEFAULT 'suggested',
  tags TEXT[] DEFAULT '{}',
  source_name TEXT,
  source_logo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  deadline_at TIMESTAMPTZ,
  application_url TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Published content (mobile app reads)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES pdf_issues(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES content_drafts(id) ON DELETE SET NULL,
  content_type content_type NOT NULL DEFAULT 'article',
  category_id UUID REFERENCES categories(id),
  ministry_id UUID REFERENCES ministries(id),
  tender_category_id UUID REFERENCES tender_categories(id),
  title_ar TEXT NOT NULL,
  summary_ar TEXT,
  body_ar TEXT,
  slug TEXT NOT NULL UNIQUE,
  search_text TEXT,
  tags TEXT[] DEFAULT '{}',
  source_name TEXT DEFAULT 'كويت اليوم',
  source_logo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  application_url TEXT,
  page_start INT,
  page_end INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX content_items_search_idx ON content_items USING GIN (to_tsvector('simple', COALESCE(search_text, '')));
CREATE INDEX content_items_published_idx ON content_items (is_published, published_at DESC);
CREATE INDEX content_drafts_issue_idx ON content_drafts (issue_id, status);
CREATE INDEX pdf_issues_status_idx ON pdf_issues (extraction_status, created_at DESC);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdf_issues_updated_at BEFORE UPDATE ON pdf_issues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER content_drafts_updated_at BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_text_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_users_select ON admin_users FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY admin_users_insert ON admin_users FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY categories_admin ON categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY categories_public_read ON categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY ministries_admin ON ministries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ministries_public_read ON ministries FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY tender_categories_admin ON tender_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY tender_categories_public_read ON tender_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY pdf_issues_admin ON pdf_issues FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY extraction_jobs_admin ON extraction_jobs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY issue_text_chunks_admin ON issue_text_chunks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY content_drafts_admin ON content_drafts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY content_items_admin ON content_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY content_items_public_read ON content_items FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY audit_log_admin ON audit_log FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Storage buckets (run in Supabase dashboard or via API)
-- gazettes: private, assets: public read

-- Reference data (categories, ministries, tender_categories) is created automatically from PDF uploads.
-- See migration 004 to remove legacy seed rows and enable safe deletes.
