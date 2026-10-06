DROP POLICY IF EXISTS "Anyone can read demos" ON storage.objects;
CREATE POLICY "Signed-in users read published demo; admins read all"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'demos' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.demo_versions d WHERE d.storage_path = storage.objects.name AND d.status = 'published')
  )
);