-- Require active subscription to read published content (paid app model).

DROP POLICY IF EXISTS content_items_public_read ON content_items;

CREATE POLICY content_items_subscriber_read ON content_items
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND has_active_subscription(auth.uid())
  );

DROP POLICY IF EXISTS capt_tenders_public_read ON capt_tenders;

CREATE POLICY capt_tenders_subscriber_read ON capt_tenders
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND has_active_subscription(auth.uid())
  );
