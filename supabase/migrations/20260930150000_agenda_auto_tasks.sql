-- Tarefas automáticas da pauta: no dia da reunião (ou N dias antes), cada item
-- da pauta vira uma tarefa do responsável da reunião, com os participantes como
-- colaboradores. Concluir essa tarefa marca o item como "Concluído".
-- "Gerar tarefa" continua disponível para tarefas extras.

-- 1. Opção por reunião. create_before_days passa a valer para reuniões também.
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS auto_create_tasks boolean NOT NULL DEFAULT false;

UPDATE public.obligations
SET auto_create_tasks = true, create_before_days = 0
WHERE meeting_mode;

-- 2. Marcações: qual tarefa é a automática e quando o item já a recebeu.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS obligation_auto_task boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_agenda_item_auto_task_idx
  ON public.tasks (obligation_agenda_item_id)
  WHERE obligation_auto_task AND obligation_agenda_item_id IS NOT NULL;

ALTER TABLE public.obligation_agenda_items
  ADD COLUMN IF NOT EXISTS auto_task_created_at timestamptz;

-- 3. A tarefa automática não conta como resultado "Gerar tarefa".
CREATE OR REPLACE FUNCTION public.mark_agenda_item_with_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.obligation_agenda_item_id IS NOT NULL AND NOT NEW.obligation_auto_task THEN
    UPDATE public.obligation_agenda_items
    SET result = 'task'
    WHERE id = NEW.obligation_agenda_item_id
      AND result IS DISTINCT FROM 'task';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Concluir a tarefa automática conclui o item da pauta.
CREATE OR REPLACE FUNCTION public.complete_agenda_item_from_auto_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.obligation_auto_task
    AND NEW.obligation_agenda_item_id IS NOT NULL
    AND (
      NEW.completed_at IS NOT NULL
      OR NEW.status = 'done'::public.task_status
      OR EXISTS (
        SELECT 1 FROM public.task_statuses status
        WHERE status.id = NEW.status_id AND status.is_completed
      )
    )
  THEN
    UPDATE public.obligation_agenda_items
    SET result = 'done'
    WHERE id = NEW.obligation_agenda_item_id
      AND result IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_agenda_item_from_auto_task ON public.tasks;
CREATE TRIGGER trg_complete_agenda_item_from_auto_task
  AFTER UPDATE OF status, status_id, completed_at ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.complete_agenda_item_from_auto_task();

-- 5. Cria as tarefas automáticas de uma reunião (uma por item, uma única vez).
CREATE OR REPLACE FUNCTION public.create_agenda_auto_tasks(target_occurrence_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  occurrence_record public.obligation_occurrences%ROWTYPE;
  obligation_record public.obligations%ROWTYPE;
  item_record record;
  selected_status_id uuid;
  selected_column_id uuid;
  task_assignee uuid;
  next_position integer;
  new_task_id uuid;
  created_count integer := 0;
BEGIN
  SELECT * INTO occurrence_record
  FROM public.obligation_occurrences
  WHERE id = target_occurrence_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_workspace_access(occurrence_record.workspace_id) THEN
    RAISE EXCEPTION 'Você não pode criar tarefas neste ambiente';
  END IF;
  IF occurrence_record.status IN ('completed', 'skipped') THEN RETURN 0; END IF;

  SELECT * INTO obligation_record
  FROM public.obligations
  WHERE id = occurrence_record.obligation_id;
  IF NOT FOUND OR NOT obligation_record.auto_create_tasks THEN RETURN 0; END IF;

  PERFORM public.prepare_obligation_agenda(target_occurrence_id);

  task_assignee := coalesce(obligation_record.assignee_id, obligation_record.created_by);

  selected_status_id := obligation_record.status_id;
  IF selected_status_id IS NULL THEN
    SELECT id INTO selected_status_id
    FROM public.task_statuses
    WHERE workspace_id = obligation_record.workspace_id AND NOT is_completed
    ORDER BY position, created_at
    LIMIT 1;
  END IF;

  selected_column_id := obligation_record.column_id;
  IF selected_column_id IS NULL THEN
    SELECT id INTO selected_column_id
    FROM public.kanban_columns
    WHERE workspace_id = obligation_record.workspace_id
    ORDER BY position, created_at
    LIMIT 1;
  END IF;

  SELECT coalesce(max(position), -1) + 1 INTO next_position
  FROM public.tasks
  WHERE workspace_id = obligation_record.workspace_id
    AND column_id IS NOT DISTINCT FROM selected_column_id
    AND deleted_at IS NULL;

  FOR item_record IN
    SELECT item.*
    FROM public.obligation_agenda_items item
    WHERE item.occurrence_id = target_occurrence_id
      AND item.result IS NULL
      AND item.auto_task_created_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks task
        WHERE task.obligation_agenda_item_id = item.id AND task.obligation_auto_task
      )
    ORDER BY item.position, item.created_at
  LOOP
    new_task_id := gen_random_uuid();
    INSERT INTO public.tasks (
      id, title, description, status, status_id, priority, due_date, due_time,
      assignee_id, column_id, position, created_by, workspace_id,
      obligation_agenda_item_id, obligation_auto_task
    ) VALUES (
      new_task_id,
      item_record.title,
      'Pauta da ' || obligation_record.title || ' de '
        || to_char(occurrence_record.due_date, 'DD/MM/YYYY') || '.',
      'todo'::public.task_status,
      selected_status_id,
      obligation_record.priority,
      (
        occurrence_record.due_date
        + coalesce(occurrence_record.due_time, time '12:00')
      ) AT TIME ZONE 'America/Sao_Paulo',
      occurrence_record.due_time,
      task_assignee,
      selected_column_id,
      next_position,
      obligation_record.created_by,
      obligation_record.workspace_id,
      item_record.id,
      true
    );

    INSERT INTO public.task_collaborators (task_id, collaborator_id, added_by)
    SELECT new_task_id, participant.user_id, obligation_record.created_by
    FROM public.obligation_participants participant
    WHERE participant.obligation_id = obligation_record.id
      AND participant.user_id IS DISTINCT FROM task_assignee
    ON CONFLICT DO NOTHING;

    UPDATE public.obligation_agenda_items
    SET auto_task_created_at = now()
    WHERE id = item_record.id;

    created_count := created_count + 1;
    next_position := next_position + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

-- 6. Rotina diária: além dos avisos, cria as tarefas automáticas do dia.
CREATE OR REPLACE FUNCTION public.run_obligation_cycle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  local_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  meeting record;
  reminded_count integer := 0;
BEGIN
  PERFORM public.materialize_obligations(180);

  FOR meeting IN
    SELECT occurrence.id, occurrence.due_date, occurrence.reminded_at,
           obligation.id AS obligation_id, obligation.title, obligation.assignee_id
    FROM public.obligation_occurrences occurrence
    JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
    WHERE occurrence.status IN ('scheduled', 'open')
      AND obligation.is_active
      AND obligation.meeting_mode
      AND occurrence.due_date >= local_today
      AND occurrence.due_date - obligation.reminder_days_before <= local_today
      AND (auth.uid() IS NULL OR occurrence.workspace_id = public.current_workspace_id())
    ORDER BY occurrence.due_date
  LOOP
    PERFORM public.prepare_obligation_agenda(meeting.id);

    IF meeting.reminded_at IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, obligation_occurrence_id)
      SELECT recipient.user_id,
             'obligation_meeting',
             'Reunião em ' || to_char(meeting.due_date, 'DD/MM') || ': ' || meeting.title,
             'Revise a pauta e inclua novos assuntos antes da reunião.',
             meeting.id
      FROM (
        SELECT participant.user_id
        FROM public.obligation_participants participant
        WHERE participant.obligation_id = meeting.obligation_id
        UNION
        SELECT meeting.assignee_id WHERE meeting.assignee_id IS NOT NULL
      ) recipient;

      UPDATE public.obligation_occurrences SET reminded_at = now() WHERE id = meeting.id;
      reminded_count := reminded_count + 1;
    END IF;
  END LOOP;

  FOR meeting IN
    SELECT occurrence.id
    FROM public.obligation_occurrences occurrence
    JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
    WHERE occurrence.status IN ('scheduled', 'open')
      AND obligation.is_active
      AND obligation.meeting_mode
      AND obligation.auto_create_tasks
      AND occurrence.due_date >= local_today
      AND occurrence.due_date - obligation.create_before_days <= local_today
      AND (auth.uid() IS NULL OR occurrence.workspace_id = public.current_workspace_id())
    ORDER BY occurrence.due_date
  LOOP
    PERFORM public.create_agenda_auto_tasks(meeting.id);
  END LOOP;

  RETURN reminded_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agenda_auto_tasks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agenda_auto_tasks(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_agenda_item_from_auto_task() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_agenda_item_with_task() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
