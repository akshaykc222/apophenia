-- Storage buckets for gazettes (private) and assets (public logos)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('gazettes', 'gazettes', false, 52428800, ARRAY['application/pdf']),
  ('assets', 'assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Gazettes: admin only
CREATE POLICY gazettes_admin_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gazettes' AND is_admin());

CREATE POLICY gazettes_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gazettes' AND is_admin());

CREATE POLICY gazettes_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gazettes' AND is_admin());

CREATE POLICY gazettes_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gazettes' AND is_admin());

-- Assets: public read, admin write
CREATE POLICY assets_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'assets');

CREATE POLICY assets_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND is_admin());

CREATE POLICY assets_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND is_admin());

CREATE POLICY assets_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND is_admin());
