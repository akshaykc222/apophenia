-- Allow deleting categories / ministries / tender types used by content (clears FK on items)

ALTER TABLE content_drafts
  DROP CONSTRAINT IF EXISTS content_drafts_category_id_fkey,
  DROP CONSTRAINT IF EXISTS content_drafts_ministry_id_fkey,
  DROP CONSTRAINT IF EXISTS content_drafts_tender_category_id_fkey;

ALTER TABLE content_drafts
  ADD CONSTRAINT content_drafts_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_drafts_ministry_id_fkey
    FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_drafts_tender_category_id_fkey
    FOREIGN KEY (tender_category_id) REFERENCES tender_categories(id) ON DELETE SET NULL;

ALTER TABLE content_items
  DROP CONSTRAINT IF EXISTS content_items_category_id_fkey,
  DROP CONSTRAINT IF EXISTS content_items_ministry_id_fkey,
  DROP CONSTRAINT IF EXISTS content_items_tender_category_id_fkey;

ALTER TABLE content_items
  ADD CONSTRAINT content_items_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_items_ministry_id_fkey
    FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_items_tender_category_id_fkey
    FOREIGN KEY (tender_category_id) REFERENCES tender_categories(id) ON DELETE SET NULL;

-- Remove initial seed rows when nothing references them (PDF auto-create replaces defaults)
DELETE FROM categories c
WHERE c.slug IN ('ministries', 'addendums', 'decrees')
  AND NOT EXISTS (SELECT 1 FROM content_items i WHERE i.category_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM content_drafts d WHERE d.category_id = c.id);

DELETE FROM ministries m
WHERE m.slug IN ('interior', 'finance', 'public-works', 'cabinet')
  AND NOT EXISTS (SELECT 1 FROM content_items i WHERE i.ministry_id = m.id)
  AND NOT EXISTS (SELECT 1 FROM content_drafts d WHERE d.ministry_id = m.id);

DELETE FROM tender_categories t
WHERE t.slug IN ('services', 'consultancy', 'construction', 'supply')
  AND NOT EXISTS (SELECT 1 FROM content_items i WHERE i.tender_category_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM content_drafts d WHERE d.tender_category_id = t.id);
