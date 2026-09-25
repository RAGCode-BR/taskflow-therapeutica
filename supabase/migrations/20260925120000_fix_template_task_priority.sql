-- Corrige a criação das pautas padrão: a prioridade da pauta é texto e a da
-- obrigação é public.task_priority. O COALESCE sem conversão falhava e
-- interrompia materialize_obligations (tela de Obrigações).

CREATE OR REPLACE FUNCTION public.create_obligation_template_tasks(target_occurrence_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  occurrence_record record;
  obligation_record public.obligations%ROWTYPE;
  template_record record;
  selected_status_id uuid;
  selected_column_id uuid;
  next_position integer;
  created_count integer := 0;
  inserted_count integer;
BEGIN
  SELECT * INTO occurrence_record
  FROM public.obligation_occurrences
  WHERE id = target_occurrence_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_workspace_access(occurrence_record.workspace_id) THEN
    RAISE EXCEPTION 'Você não pode criar tarefas neste ambiente';
  END IF;
  IF occurrence_record.status IN ('completed', 'skipped') THEN RETURN 0; END IF;

  SELECT * INTO obligation_record
  FROM public.obligations
  WHERE id = occurrence_record.obligation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Obrigação não encontrada'; END IF;

  -- Mesmas regras de create_obligation_task para status, coluna e prazo.
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

  FOR template_record IN
    SELECT template.*
    FROM public.obligation_task_templates template
    WHERE template.obligation_id = obligation_record.id
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks task
        WHERE task.obligation_occurrence_id = occurrence_record.id
          AND task.obligation_template_id = template.id
      )
    ORDER BY template.position, template.created_at
  LOOP
    INSERT INTO public.tasks (
      title, description, status, status_id, priority, due_date, due_time,
      assignee_id, client_id, column_id, position, created_by, workspace_id,
      obligation_occurrence_id, obligation_template_id
    ) VALUES (
      template_record.title,
      template_record.description,
      'todo'::public.task_status,
      selected_status_id,
      coalesce(template_record.priority::public.task_priority, obligation_record.priority),
      (
        occurrence_record.due_date
        + coalesce(occurrence_record.due_time, time '12:00')
      ) AT TIME ZONE 'America/Sao_Paulo',
      occurrence_record.due_time,
      coalesce(template_record.assignee_id, obligation_record.assignee_id),
      obligation_record.client_id,
      selected_column_id,
      next_position,
      obligation_record.created_by,
      obligation_record.workspace_id,
      occurrence_record.id,
      template_record.id
    )
    ON CONFLICT (obligation_occurrence_id, obligation_template_id)
      WHERE obligation_occurrence_id IS NOT NULL AND obligation_template_id IS NOT NULL
      DO NOTHING;
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    created_count := created_count + inserted_count;
    next_position := next_position + inserted_count;
  END LOOP;

  RETURN created_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
