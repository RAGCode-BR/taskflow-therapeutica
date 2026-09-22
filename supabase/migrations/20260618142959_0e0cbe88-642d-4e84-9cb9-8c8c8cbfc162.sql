
-- 1) Clients: restrict writes to admins, keep read open to authenticated
DROP POLICY IF EXISTS clients_all_auth ON public.clients;

CREATE POLICY clients_select_auth ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY clients_insert_admin ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY clients_update_admin ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY clients_delete_admin ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) client_files: require uploaded_by = auth.uid() on insert
DROP POLICY IF EXISTS client_files_insert ON public.client_files;
CREATE POLICY client_files_insert ON public.client_files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- 3) client_notes: require created_by = auth.uid() on insert
DROP POLICY IF EXISTS client_notes_insert ON public.client_notes;
CREATE POLICY client_notes_insert ON public.client_notes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 4) Storage: restrict SELECT on task-attachments bucket to users that can view the related task
DROP POLICY IF EXISTS task_attachments_select_auth ON storage.objects;
CREATE POLICY task_attachments_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.attachments a
      JOIN public.tasks t ON t.id = a.task_id
      WHERE a.storage_path = storage.objects.name
        AND (
          t.created_by = auth.uid()
          OR t.assignee_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );
