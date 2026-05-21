-- Merge duplicate categories into the three canonical home tabs

-- Re-point content to canonical الوزارات
UPDATE content_items ci
SET category_id = c_canon.id
FROM categories c_dup
JOIN categories c_canon ON c_canon.slug = 'ministries'
WHERE ci.category_id = c_dup.id
  AND c_dup.slug IS DISTINCT FROM 'ministries'
  AND c_dup.slug IS DISTINCT FROM 'addendums'
  AND c_dup.slug IS DISTINCT FROM 'decrees'
  AND (
    lower(c_dup.name_ar) LIKE '%وزار%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%ministr%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%government%department%'
    OR lower(c_dup.name_ar) LIKE '%government%department%'
  );

UPDATE content_drafts cd
SET category_id = c_canon.id
FROM categories c_dup
JOIN categories c_canon ON c_canon.slug = 'ministries'
WHERE cd.category_id = c_dup.id
  AND c_dup.slug IS DISTINCT FROM 'ministries'
  AND c_dup.slug IS DISTINCT FROM 'addendums'
  AND c_dup.slug IS DISTINCT FROM 'decrees'
  AND (
    lower(c_dup.name_ar) LIKE '%وزار%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%ministr%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%government%department%'
    OR lower(c_dup.name_ar) LIKE '%government%department%'
  );

-- استدراكات
UPDATE content_items ci
SET category_id = c_canon.id
FROM categories c_dup
JOIN categories c_canon ON c_canon.slug = 'addendums'
WHERE ci.category_id = c_dup.id
  AND c_dup.slug NOT IN ('ministries', 'addendums', 'decrees')
  AND (
    lower(c_dup.name_ar) LIKE '%استدراك%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%addendum%'
  );

-- أحكام ومراسيم
UPDATE content_items ci
SET category_id = c_canon.id
FROM categories c_dup
JOIN categories c_canon ON c_canon.slug = 'decrees'
WHERE ci.category_id = c_dup.id
  AND c_dup.slug NOT IN ('ministries', 'addendums', 'decrees')
  AND (
    lower(c_dup.name_ar) LIKE '%مرسوم%'
    OR lower(c_dup.name_ar) LIKE '%أحكام%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%decree%'
    OR lower(coalesce(c_dup.name_en, '')) LIKE '%judgment%'
  );

-- Delete non-canonical category rows (after repointing)
DELETE FROM categories
WHERE slug NOT IN ('ministries', 'addendums', 'decrees');

-- Ensure canonical three exist
INSERT INTO categories (name_ar, name_en, slug, sort_order, is_trending)
VALUES
  ('الوزارات', 'Ministries', 'ministries', 1, false),
  ('الاستدراكات', 'Addendums', 'addendums', 2, false),
  ('الأحكام والمراسيم', 'Judgments and Decrees', 'decrees', 3, true)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  sort_order = EXCLUDED.sort_order;
