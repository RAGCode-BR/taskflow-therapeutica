
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text;

-- Move subtarefas que estavam presas a comentários para o nível raiz da tarefa
UPDATE public.subtasks SET comment_id = NULL WHERE comment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.subtask_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id uuid NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtask_attachments TO authenticated;
GRANT ALL ON public.subtask_attachments TO service_role;
ALTER TABLE public.subtask_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subtask_attachments_all" ON public.subtask_attachments;
CREATE POLICY "subtask_attachments_all" ON public.subtask_attachments
  FOR ALL USING (public.can_view_task(task_id)) WITH CHECK (public.can_view_task(task_id));

-- can_view_task passa a considerar responsáveis de subtarefas também
CREATE OR REPLACE FUNCTION public.can_view_task(_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR t.assignee_id = auth.uid()
        OR t.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.subtasks s WHERE s.task_id = t.id AND s.assignee_id = auth.uid())
      )
  )
$$;

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR assignee_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.subtasks s WHERE s.task_id = tasks.id AND s.assignee_id = auth.uid())
);

-- Notificação de atribuição de subtarefa
CREATE OR REPLACE FUNCTION public.notify_subtask_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  assigner_name text;
  task_title text;
  clean_title text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;
  IF NEW.assignee_id = actor THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email) INTO assigner_name FROM public.profiles WHERE id = actor;
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
  clean_title := regexp_replace(COALESCE(NEW.title, ''), '<[^>]+>', '', 'g');

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    NEW.assignee_id,
    NEW.task_id,
    'subtask_assignment',
    'Nova subtarefa atribuída a você',
    COALESCE(assigner_name, 'Alguém') || ' atribuiu a subtarefa "' || clean_title || '"' ||
    CASE WHEN task_title IS NOT NULL THEN ' em: ' || task_title ELSE '' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_subtask_assignment ON public.subtasks;
CREATE TRIGGER trg_notify_subtask_assignment
  AFTER INSERT OR UPDATE OF assignee_id ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_subtask_assignment();
