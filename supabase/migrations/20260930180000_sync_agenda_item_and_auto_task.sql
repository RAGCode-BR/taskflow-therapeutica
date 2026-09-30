-- Item da pauta e tarefa automática andam juntos nos dois sentidos:
-- - marcar "Concluído" no item conclui a tarefa automática; desmarcar reabre;
-- - concluir a tarefa automática conclui o item; reabrir a tarefa desmarca o item.
-- As tarefas extras ("Gerar tarefa") não são afetadas.

-- 1. Tarefa → item (substitui a versão que só concluía).
CREATE OR REPLACE FUNCTION public.complete_agenda_item_from_auto_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_completed boolean;
  was_completed boolean;
BEGIN
  IF NOT NEW.obligation_auto_task OR NEW.obligation_agenda_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  is_completed := NEW.completed_at IS NOT NULL
    OR NEW.status = 'done'::public.task_status
    OR EXISTS (
      SELECT 1 FROM public.task_statuses status
      WHERE status.id = NEW.status_id AND status.is_completed
    );
  was_completed := OLD.completed_at IS NOT NULL
    OR OLD.status = 'done'::public.task_status
    OR EXISTS (
      SELECT 1 FROM public.task_statuses status
      WHERE status.id = OLD.status_id AND status.is_completed
    );

  IF is_completed AND NOT was_completed THEN
    UPDATE public.obligation_agenda_items
    SET result = 'done'
    WHERE id = NEW.obligation_agenda_item_id AND result IS NULL;
  ELSIF was_completed AND NOT is_completed THEN
    UPDATE public.obligation_agenda_items
    SET result = NULL
    WHERE id = NEW.obligation_agenda_item_id AND result = 'done';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Item → tarefa.
CREATE OR REPLACE FUNCTION public.sync_auto_task_from_agenda_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_workspace uuid;
  target_status_id uuid;
BEGIN
  IF NEW.result IS NOT DISTINCT FROM OLD.result THEN RETURN NEW; END IF;

  SELECT occurrence.workspace_id INTO item_workspace
  FROM public.obligation_occurrences occurrence
  WHERE occurrence.id = NEW.occurrence_id;

  IF NEW.result = 'done' THEN
    SELECT id INTO target_status_id
    FROM public.task_statuses
    WHERE workspace_id = item_workspace AND is_completed
    ORDER BY position, created_at
    LIMIT 1;

    UPDATE public.tasks
    SET status = 'done'::public.task_status,
        status_id = coalesce(target_status_id, status_id),
        completed_at = coalesce(completed_at, now())
    WHERE obligation_agenda_item_id = NEW.id
      AND obligation_auto_task
      AND deleted_at IS NULL
      AND completed_at IS NULL;
  ELSIF OLD.result = 'done' AND NEW.result IS NULL THEN
    SELECT id INTO target_status_id
    FROM public.task_statuses
    WHERE workspace_id = item_workspace AND NOT is_completed
    ORDER BY position, created_at
    LIMIT 1;

    UPDATE public.tasks
    SET status = 'todo'::public.task_status,
        status_id = coalesce(target_status_id, status_id),
        completed_at = NULL
    WHERE obligation_agenda_item_id = NEW.id
      AND obligation_auto_task
      AND deleted_at IS NULL
      AND (completed_at IS NOT NULL OR status = 'done'::public.task_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auto_task_from_agenda_item ON public.obligation_agenda_items;
CREATE TRIGGER trg_sync_auto_task_from_agenda_item
  AFTER UPDATE OF result ON public.obligation_agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_auto_task_from_agenda_item();

REVOKE ALL ON FUNCTION public.sync_auto_task_from_agenda_item() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_agenda_item_from_auto_task() FROM PUBLIC, anon, authenticated;
