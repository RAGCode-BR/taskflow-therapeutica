
-- 1) Storage: restrict DELETE on task-attachments to the uploader (via attachments.uploaded_by)
DROP POLICY IF EXISTS "auth_can_delete_attachments" ON storage.objects;
CREATE POLICY "task_attachments_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_path = storage.objects.name
      AND a.uploaded_by = auth.uid()
  )
);

-- Keep SELECT/INSERT broad to preserve team-collaboration behavior on shared tasks,
-- but ensure INSERT is owned by the uploader (path-agnostic; metadata table tracks ownership).
DROP POLICY IF EXISTS "auth_can_select_attachments" ON storage.objects;
CREATE POLICY "task_attachments_select_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "auth_can_upload_attachments" ON storage.objects;
CREATE POLICY "task_attachments_insert_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() = owner);

-- 2) Revoke EXECUTE on SECURITY DEFINER trigger functions (only triggers call these)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_interruptions_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- Note: public.has_role(uuid, app_role) must remain executable by authenticated because RLS policies invoke it.
