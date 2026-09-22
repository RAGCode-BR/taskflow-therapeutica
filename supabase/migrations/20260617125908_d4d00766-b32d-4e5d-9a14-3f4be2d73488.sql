
-- 1. Soft-delete flag em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Helper: tarefa visível ao usuário corrente?
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR t.assignee_id = auth.uid()
        OR t.created_by = auth.uid()
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_task(uuid) TO authenticated;

-- 3. Default created_by em tasks
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tasks_default_created_by ON public.tasks;
CREATE TRIGGER trg_tasks_default_created_by
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_task_created_by();

-- 4. TASKS: política por papel
DROP POLICY IF EXISTS tasks_all_auth ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR assignee_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR assignee_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR assignee_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- 5. SUBTASKS / ATTACHMENTS / TAG LINKS / INTERRUPTIONS: gated by parent task
DROP POLICY IF EXISTS subtasks_all_auth ON public.subtasks;
CREATE POLICY subtasks_all ON public.subtasks FOR ALL TO authenticated
  USING (public.can_view_task(task_id)) WITH CHECK (public.can_view_task(task_id));

DROP POLICY IF EXISTS att_all_auth ON public.attachments;
CREATE POLICY attachments_all ON public.attachments FOR ALL TO authenticated
  USING (public.can_view_task(task_id)) WITH CHECK (public.can_view_task(task_id));

DROP POLICY IF EXISTS task_tag_links_all_auth ON public.task_tag_links;
CREATE POLICY task_tag_links_all ON public.task_tag_links FOR ALL TO authenticated
  USING (public.can_view_task(task_id)) WITH CHECK (public.can_view_task(task_id));

DROP POLICY IF EXISTS "auth interruptions" ON public.task_interruptions;
CREATE POLICY task_interruptions_select ON public.task_interruptions FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));
CREATE POLICY task_interruptions_write ON public.task_interruptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_task(task_id));
CREATE POLICY task_interruptions_update ON public.task_interruptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY task_interruptions_delete ON public.task_interruptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6. COMMENTS / HISTORY: gated select by parent task
DROP POLICY IF EXISTS comments_select_all ON public.comments;
CREATE POLICY comments_select ON public.comments FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));
DROP POLICY IF EXISTS hist_select_all ON public.task_history;
CREATE POLICY hist_select ON public.task_history FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

-- 7. PROFILES: admins podem atualizar qualquer perfil (incluindo is_active)
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own_or_admin ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));
