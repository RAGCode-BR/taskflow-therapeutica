-- O responsável pode executar a tarefa, mas não cancelá-la nem excluí-la
-- quando ela foi atribuída por outra pessoa. A regra no banco também protege
-- chamadas feitas fora da interface.
CREATE OR REPLACE FUNCTION public.prevent_assignee_task_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN
    RETURN NEW;
  END IF;

  IF OLD.assignee_id = auth.uid()
     AND OLD.created_by IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas o criador ou um administrador pode cancelar esta tarefa.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_assignee_task_cancellation ON public.tasks;
CREATE TRIGGER trg_prevent_assignee_task_cancellation
  BEFORE UPDATE OF deleted_at ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_assignee_task_cancellation();

CREATE OR REPLACE FUNCTION public.prevent_assignee_subtask_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_creator uuid;
BEGIN
  SELECT created_by INTO task_creator FROM public.tasks WHERE id = OLD.task_id;

  IF OLD.assignee_id = auth.uid()
     AND task_creator IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas o criador da tarefa ou um administrador pode excluir esta subtarefa.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_assignee_subtask_deletion ON public.subtasks;
CREATE TRIGGER trg_prevent_assignee_subtask_deletion
  BEFORE DELETE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_assignee_subtask_deletion();
