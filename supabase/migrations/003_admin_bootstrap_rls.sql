-- Allow first admin to self-register when admin_users is empty

CREATE POLICY admin_users_select_own ON admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY admin_users_bootstrap_insert ON admin_users
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM admin_users)
  );
