-- Track PDF discovery and source for reference rows (ministries, tender types)

ALTER TABLE ministries
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pdf'
    CHECK (source IN ('pdf', 'manual', 'canonical'));

ALTER TABLE tender_categories
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pdf'
    CHECK (source IN ('pdf', 'manual', 'canonical'));

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'canonical'
    CHECK (source IN ('pdf', 'manual', 'canonical'));

UPDATE categories SET source = 'canonical'
WHERE slug IN ('ministries', 'addendums', 'decrees');
