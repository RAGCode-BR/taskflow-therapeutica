
DROP POLICY IF EXISTS task_attachments_select_auth ON storage.objects;
DROP POLICY IF EXISTS task_attachments_delete_own ON storage.objects;

CREATE POLICY task_attachments_select_auth
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY task_attachments_delete_own
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    owner = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.attachments a WHERE a.storage_path = objects.name AND a.uploaded_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.comment_attachments ca WHERE ca.storage_path = objects.name AND ca.uploaded_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_note_attachments na WHERE na.storage_path = objects.name AND na.uploaded_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.client_files cf WHERE cf.storage_path = objects.name AND cf.uploaded_by = auth.uid())
  )
);
