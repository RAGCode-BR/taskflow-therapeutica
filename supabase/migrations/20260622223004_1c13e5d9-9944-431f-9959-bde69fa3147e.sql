
-- 1. comment_attachments: add UPDATE policy restricted to uploader/admin
CREATE POLICY "comment_attachments_update"
ON public.comment_attachments
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2. profiles: restrict email column at the privilege level
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, full_name, avatar_url, color, theme_preferences, is_active, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Admin-only RPC to fetch emails (used by the users admin page)
CREATE OR REPLACE FUNCTION public.admin_get_profile_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.admin_get_profile_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_profile_emails() TO authenticated;

-- 3. task_history: ensure inserts are only for viewable tasks
DROP POLICY IF EXISTS hist_insert_self ON public.task_history;
CREATE POLICY hist_insert_self
ON public.task_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_view_task(task_id));

-- 4. user_roles: only own row visible to self; admins still see all (via roles_admin_manage)
DROP POLICY IF EXISTS roles_select_all_auth ON public.user_roles;
CREATE POLICY roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. storage.objects: explicit restrictive UPDATE policy for task-attachments
CREATE POLICY "task_attachments_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'task-attachments' AND owner = auth.uid())
WITH CHECK (bucket_id = 'task-attachments' AND owner = auth.uid());
