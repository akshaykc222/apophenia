-- Restore public read for published content (App Store Guideline 5.1.1(v)).
-- Subscription remains required for AI assistant (API) and optional premium features.

DROP POLICY IF EXISTS content_items_subscriber_read ON content_items;

CREATE POLICY content_items_public_read ON content_items
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- CAPT tenders: allow guest read (open tenders only)
DROP POLICY IF EXISTS capt_tenders_app_read ON capt_tenders;

CREATE POLICY capt_tenders_public_read ON capt_tenders
  FOR SELECT TO anon, authenticated
  USING (status = 'open');
