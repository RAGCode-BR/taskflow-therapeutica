-- Segurança: as regras que antes existiam só na tela passam a valer no banco.
-- Sonda de 05/10 (colaborador comum, via API) conseguia: apagar 155 tarefas de
-- outras pessoas, apagar todas as reuniões e departamentos, alterar colunas do
-- Kanban e listar anexos de conversas das quais não participa.

-- 0. Permissão de página, igual à tela: admin tem todas; os demais, as marcadas
--    no ambiente ou no usuário.
CREATE OR REPLACE FUNCTION public.has_page_permission(_page text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.workspace_memberships membership
      WHERE membership.user_id = (SELECT auth.uid()) AND _page = ANY (membership.permissions)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_permissions access
      WHERE access.user_id = (SELECT auth.uid()) AND _page = ANY (access.permissions)
    );
$$;

REVOKE ALL ON FUNCTION public.has_page_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_page_permission(text) TO authenticated;

-- 1. Tarefas: apagar (de vez ou mandar para a lixeira) só admin ou quem criou.
DROP POLICY IF EXISTS workspace_tasks_delete ON public.tasks;
CREATE POLICY workspace_tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (
    (public.has_workspace_access(workspace_id) OR public.can_create_in_workspace(workspace_id))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR created_by = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.guard_task_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    AND auth.uid() IS NOT NULL
    AND OLD.created_by IS DISTINCT FROM auth.uid()
    AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
  THEN
    RAISE EXCEPTION 'Só quem criou a tarefa ou um administrador pode excluí-la ou restaurá-la'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_trash ON public.tasks;
CREATE TRIGGER trg_guard_task_trash
  BEFORE UPDATE OF deleted_at ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_trash();

REVOKE ALL ON FUNCTION public.guard_task_trash() FROM PUBLIC, anon, authenticated;

-- 2. Colunas do Kanban: todos veem; só admin cria, altera ou apaga.
DROP POLICY IF EXISTS workspace_kanban_columns_access ON public.kanban_columns;
CREATE POLICY workspace_kanban_columns_select ON public.kanban_columns
  FOR SELECT TO authenticated
  USING (public.has_workspace_access(workspace_id));
CREATE POLICY workspace_kanban_columns_admin_write ON public.kanban_columns
  FOR ALL TO authenticated
  USING (
    public.has_workspace_access(workspace_id)
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_workspace_access(workspace_id)
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

-- 3. Reuniões: todos do ambiente leem; só quem tem a página "Reuniões" altera.
--    As rotinas automáticas (SECURITY DEFINER) continuam funcionando.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('obligations', 'obligations_workspace_access',
      'public.has_workspace_access(workspace_id)'),
    ('obligation_departments', 'obligation_departments_workspace_access',
      'public.has_workspace_access(workspace_id)'),
    ('obligation_occurrences', 'obligation_occurrences_workspace_access',
      'public.has_workspace_access(workspace_id)'),
    ('obligation_department_members', 'obligation_department_members_access',
      'EXISTS (SELECT 1 FROM public.obligation_departments department WHERE department.id = department_id AND public.has_workspace_access(department.workspace_id))'),
    ('obligation_participants', 'obligation_participants_access',
      'EXISTS (SELECT 1 FROM public.obligations obligation WHERE obligation.id = obligation_id AND public.has_workspace_access(obligation.workspace_id))'),
    ('obligation_task_templates', 'obligation_task_templates_workspace_access',
      'EXISTS (SELECT 1 FROM public.obligations obligation WHERE obligation.id = obligation_id AND public.has_workspace_access(obligation.workspace_id))'),
    ('obligation_agenda_items', 'obligation_agenda_items_access',
      'EXISTS (SELECT 1 FROM public.obligation_occurrences occurrence WHERE occurrence.id = occurrence_id AND public.has_workspace_access(occurrence.workspace_id))')
  ) AS t(table_name, old_policy, scope)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.old_policy, spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_select', spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_manage', spec.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      spec.table_name || '_select', spec.table_name, spec.scope
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((%s) AND public.has_page_permission(''obligations'')) WITH CHECK ((%s) AND public.has_page_permission(''obligations''))',
      spec.table_name || '_manage', spec.table_name, spec.scope, spec.scope
    );
  END LOOP;
END $$;

-- 4. Anexos (bucket task-attachments): só quem enviou, admin, quem vê a tarefa no ambiente
--    (anexos da tarefa) ou quem participa da conversa (anexos de comentários).
DROP POLICY IF EXISTS task_attachments_select_auth ON storage.objects;
DROP POLICY IF EXISTS task_attachments_select_participants ON storage.objects;
CREATE POLICY task_attachments_select_participants ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      owner = (SELECT auth.uid())
      OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.attachments attachment
        JOIN public.tasks task ON task.id = attachment.task_id
        WHERE attachment.storage_path = objects.name
          AND (public.has_workspace_access(task.workspace_id) OR public.participates_in_task(task.id))
      )
      OR EXISTS (
        SELECT 1 FROM public.comment_attachments attachment
        WHERE attachment.storage_path = objects.name
          AND (
            public.can_access_task_conversation(attachment.task_id)
            OR public.can_oversee_task_conversation(attachment.task_id)
          )
      )
    )
  );
