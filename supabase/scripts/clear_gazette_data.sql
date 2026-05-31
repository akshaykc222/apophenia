-- Delete ALL gazette upload + extracted content data.
-- Does NOT delete categories, ministries, tender_categories, help, users, or push data.
-- Run in Supabase SQL Editor (service role / postgres).

BEGIN;

-- Published content linked to issues (issue_id uses ON DELETE SET NULL, not CASCADE)
DELETE FROM content_items
WHERE issue_id IS NOT NULL
   OR source_name = 'كويت اليوم';

-- Cascades from pdf_issues would cover drafts/chunks/jobs, but explicit is clearer
DELETE FROM content_drafts;
DELETE FROM issue_text_chunks;
DELETE FROM extraction_jobs;
DELETE FROM pdf_issues;

COMMIT;

-- PDF files: delete separately in Dashboard → Storage → gazettes
-- Or use: npx tsx scripts/clear-gazette-data.mts --confirm
