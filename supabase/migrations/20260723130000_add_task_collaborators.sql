-- Vários colaboradores podem participar da mesma tarefa.
CREATE TABLE IF NOT EXISTS public.task_collaborators (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS task_collaborators_collaborator_idx
  ON public.task_collaborators(collaborator_id);

ALTER TABLE public.task_collaborators ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.task_collaborators TO authenticated;
GRANT ALL ON public.task_collaborators TO service_role;

-- Colaboradores também podem visualizar a tarefa e seus recursos vinculados.
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR t.assignee_id = auth.uid()
        OR t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_collaborators tc
          WHERE tc.task_id = t.id AND tc.collaborator_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.subtasks s
          WHERE s.task_id = t.id AND s.assignee_id = auth.uid()
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_task_collaborators(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR t.created_by = auth.uid()
        OR t.assignee_id = auth.uid()
      )
  )
$$;

DROP POLICY IF EXISTS task_collaborators_select ON public.task_collaborators;
CREATE POLICY task_collaborators_select ON public.task_collaborators
  FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

DROP POLICY IF EXISTS task_collaborators_insert ON public.task_collaborators;
CREATE POLICY task_collaborators_insert ON public.task_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_task_collaborators(task_id));

DROP POLICY IF EXISTS task_collaborators_delete ON public.task_collaborators;
CREATE POLICY task_collaborators_delete ON public.task_collaborators
  FOR DELETE TO authenticated
  USING (public.can_manage_task_collaborators(task_id));

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (public.can_view_task(id));

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (public.can_view_task(id))
  WITH CHECK (public.can_view_task(id));
