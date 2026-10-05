-- Leitura restrita: colaborador só lê as tarefas de que participa (responsável,
-- colaborador, responsável por subtarefa) ou que criou, e só as reuniões em que
-- é participante, responsável ou que criou. Administradores continuam vendo tudo.

-- 1. Auxiliares (SECURITY DEFINER para não depender do RLS das tabelas consultadas).
CREATE OR REPLACE FUNCTION public.is_task_member(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_collaborators collaborator
    WHERE collaborator.task_id = _task_id AND collaborator.collaborator_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.subtasks subtask
    WHERE subtask.task_id = _task_id AND subtask.assignee_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_obligation_participant(_obligation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obligation_participants participant
    WHERE participant.obligation_id = _obligation_id AND participant.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_obligation(_obligation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obligations obligation
    WHERE obligation.id = _obligation_id
      AND public.has_workspace_access(obligation.workspace_id)
      AND (
        public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
        OR obligation.assignee_id = (SELECT auth.uid())
        OR obligation.created_by = (SELECT auth.uid())
        OR public.is_obligation_participant(obligation.id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_occurrence(_occurrence_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obligation_occurrences occurrence
    WHERE occurrence.id = _occurrence_id
      AND public.can_view_obligation(occurrence.obligation_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_task_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_obligation_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_obligation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_occurrence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_task_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_obligation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_obligation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_occurrence(uuid) TO authenticated;

-- 2. Tarefas. Os campos da própria linha (responsável, criador) são conferidos
--    direto, para valer também na tarefa que acabou de ser criada.
DROP POLICY IF EXISTS workspace_tasks_select ON public.tasks;
CREATE POLICY workspace_tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (
    (
      public.has_workspace_access(workspace_id)
      AND (
        public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
        OR assignee_id = (SELECT auth.uid())
        OR created_by = (SELECT auth.uid())
        OR public.is_task_member(id)
      )
    )
    OR public.participates_in_task(id)
    OR (
      origin_workspace_id IS DISTINCT FROM workspace_id
      AND created_by = (SELECT auth.uid())
      AND public.has_workspace_access(origin_workspace_id)
    )
  );

-- 3. Dados ligados à tarefa (subtarefas, colaboradores, etiquetas, histórico,
--    anexos, mudanças de prazo) seguem a mesma regra.
CREATE OR REPLACE FUNCTION public.can_access_workspace_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks task
    WHERE task.id = _task_id
      AND (
        (
          (
            public.has_workspace_access(task.workspace_id)
            -- Administrador associado ao ambiente de destino, preenchendo a tarefa
            -- que acabou de lançar lá sem precisar trocar de ambiente.
            OR public.can_create_in_workspace(task.workspace_id)
          )
          AND (
            public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
            OR task.assignee_id = (SELECT auth.uid())
            OR task.created_by = (SELECT auth.uid())
            OR public.is_task_member(task.id)
          )
        )
        -- Pessoa de outro ambiente marcada na tarefa.
        OR public.participates_in_task(task.id)
      )
  );
$$;

-- 4. Reuniões: leitura só para participantes, responsável, quem criou e admins.
--    Alterar continua exigindo a página "Reuniões".
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('obligations',
      'public.has_workspace_access(workspace_id) AND (public.has_role((SELECT auth.uid()), ''admin''::public.app_role) OR assignee_id = (SELECT auth.uid()) OR created_by = (SELECT auth.uid()) OR public.is_obligation_participant(id))',
      'public.has_workspace_access(workspace_id) AND public.has_page_permission(''obligations'')'),
    ('obligation_occurrences',
      'public.can_view_obligation(obligation_id)',
      'public.can_view_obligation(obligation_id) AND public.has_page_permission(''obligations'')'),
    ('obligation_participants',
      'public.can_view_obligation(obligation_id)',
      'public.can_view_obligation(obligation_id) AND public.has_page_permission(''obligations'')'),
    ('obligation_task_templates',
      'public.can_view_obligation(obligation_id)',
      'public.can_view_obligation(obligation_id) AND public.has_page_permission(''obligations'')'),
    ('obligation_agenda_items',
      'public.can_view_occurrence(occurrence_id)',
      'public.can_view_occurrence(occurrence_id) AND public.has_page_permission(''obligations'')')
  ) AS t(table_name, read_rule, write_rule)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_select', spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_manage', spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_insert', spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_update', spec.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.table_name || '_delete', spec.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      spec.table_name || '_select', spec.table_name, spec.read_rule);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      spec.table_name || '_insert', spec.table_name, spec.write_rule);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      spec.table_name || '_update', spec.table_name, spec.write_rule, spec.write_rule);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      spec.table_name || '_delete', spec.table_name, spec.write_rule);
  END LOOP;
END $$;
