-- Tarefas automáticas da pauta não geram avisos:
-- - na criação (7h): sem "Nova tarefa atribuída" e sem "adicionado como colaborador";
-- - ao marcar "Concluído" no item da reunião: sem "Tarefa concluída".
-- O aviso da reunião (sininho + pop-up) continua. Mudanças feitas depois por uma
-- pessoa (trocar o responsável, incluir colaborador, concluir pela tarefa) avisam normalmente.

-- 1. Atribuição: a tarefa automática nasce sem aviso.
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE actor uuid := auth.uid(); assigner_name text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.obligation_auto_task THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;
  IF NEW.assignee_id = actor THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email) INTO assigner_name FROM public.profiles WHERE id = actor;
  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (NEW.assignee_id, NEW.id, 'assignment',
    U&'Nova tarefa atribu\00EDda a voc\00EA',
    COALESCE(assigner_name, U&'Algu\00E9m') || ' atribuiu: ' || NEW.title);
  RETURN NEW;
END; $$;

-- 2. Colaboradores incluídos junto com a criação da tarefa automática (mesma transação).
CREATE OR REPLACE FUNCTION public.notify_task_collaborator_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := COALESCE(NEW.added_by, auth.uid());
  actor_name text;
  task_title text;
BEGIN
  IF NEW.collaborator_id = actor
     OR current_setting('app.comment_mention', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tasks task
    WHERE task.id = NEW.task_id
      AND task.obligation_auto_task
      AND task.created_at = now()
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email) INTO actor_name
  FROM public.profiles WHERE id = actor;
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    NEW.collaborator_id,
    NEW.task_id,
    'collaborator_assignment',
    U&'Voc\00EA foi adicionado como colaborador',
    COALESCE(actor_name, U&'Algu\00E9m') || U&' adicionou voc\00EA como colaborador em: ' || COALESCE(task_title, 'uma tarefa')
  );
  RETURN NEW;
END;
$$;

-- 3. Conclusão vinda do item da reunião: sem "Tarefa concluída".
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_name text;
  recipient_id uuid;
  was_completed boolean := OLD.status = 'done' OR OLD.completed_at IS NOT NULL;
  is_completed boolean := NEW.status = 'done' OR NEW.completed_at IS NOT NULL;
BEGIN
  IF NOT is_completed OR was_completed THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.agenda_item_sync', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email) INTO actor_name
  FROM public.profiles
  WHERE id = actor;

  FOR recipient_id IN
    SELECT DISTINCT participant.user_id
    FROM (
      SELECT NEW.assignee_id AS user_id
      UNION ALL
      SELECT NEW.created_by AS user_id
      UNION ALL
      SELECT tc.collaborator_id AS user_id FROM public.task_collaborators tc WHERE tc.task_id = NEW.id
      UNION ALL
      SELECT s.assignee_id AS user_id FROM public.subtasks s WHERE s.task_id = NEW.id
    ) AS participant
    WHERE participant.user_id IS NOT NULL
      AND (actor IS NULL OR participant.user_id <> actor)
  LOOP
    INSERT INTO public.notifications (user_id, task_id, type, title, body)
    VALUES (
      recipient_id,
      NEW.id,
      'task_completed',
      U&'Tarefa conclu\00EDda',
      COALESCE(actor_name, U&'Algu\00E9m') || ' concluiu a tarefa: ' || NEW.title
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Item → tarefa marca a sincronização para o aviso acima ignorar.
CREATE OR REPLACE FUNCTION public.sync_auto_task_from_agenda_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_workspace uuid;
  target_status_id uuid;
  previous_flag text := current_setting('app.agenda_item_sync', true);
BEGIN
  IF NEW.result IS NOT DISTINCT FROM OLD.result THEN RETURN NEW; END IF;

  SELECT occurrence.workspace_id INTO item_workspace
  FROM public.obligation_occurrences occurrence
  WHERE occurrence.id = NEW.occurrence_id;

  PERFORM set_config('app.agenda_item_sync', 'true', true);

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

  PERFORM set_config('app.agenda_item_sync', coalesce(previous_flag, 'false'), true);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_task_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_task_collaborator_added() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_task_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_auto_task_from_agenda_item() FROM PUBLIC, anon, authenticated;
