-- Reuniões continuam recorrentes, mas a pauta e as tarefas passam a depender
-- exclusivamente de uma ação do usuário. O ciclo diário apenas materializa as
-- datas e envia os lembretes; não copia pautas nem cria tarefas.

ALTER TABLE public.obligations
  ALTER COLUMN auto_create_tasks SET DEFAULT false;

UPDATE public.obligations
SET auto_create_tasks = false,
    create_before_days = 0
WHERE meeting_mode
  AND (auto_create_tasks OR create_before_days <> 0);

-- A função antiga fica disponível apenas para manutenção administrativa. O
-- cliente autenticado cria tarefas exclusivamente pelo formulário da reunião.
REVOKE EXECUTE ON FUNCTION public.create_agenda_auto_tasks(uuid) FROM authenticated;

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
    IF meeting.reminded_at IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, obligation_occurrence_id)
      SELECT recipient.user_id,
             'obligation_meeting',
             'Reunião em ' || to_char(meeting.due_date, 'DD/MM') || ': ' || meeting.title,
             'Gere ou revise a pauta antes da reunião.',
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

  RETURN reminded_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_obligation_occurrence(target_occurrence_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE occurrence_record record; completed_status_id uuid;
BEGIN
  SELECT occurrence.*, obligation.meeting_mode
  INTO occurrence_record
  FROM public.obligation_occurrences occurrence
  JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
  WHERE occurrence.id = target_occurrence_id
  FOR UPDATE OF occurrence;

  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada'; END IF;
  IF NOT public.has_workspace_access(occurrence_record.workspace_id) THEN
    RAISE EXCEPTION 'Você não pode concluir esta ocorrência';
  END IF;

  IF occurrence_record.meeting_mode THEN
    IF occurrence_record.agenda_prepared_at IS NULL THEN
      RAISE EXCEPTION 'Gere a pauta manualmente antes de encerrar a reunião';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.obligation_agenda_items item
      WHERE item.occurrence_id = target_occurrence_id AND item.result IS NULL
    ) THEN
      RAISE EXCEPTION 'Defina o resultado de todos os itens da pauta antes de encerrar a reunião';
    END IF;
  END IF;

  UPDATE public.obligation_occurrences
  SET status = 'completed', completed_at = coalesce(completed_at, now()), completed_by = auth.uid()
  WHERE id = target_occurrence_id;

  IF NOT occurrence_record.meeting_mode AND occurrence_record.task_id IS NOT NULL THEN
    SELECT id INTO completed_status_id FROM public.task_statuses
    WHERE workspace_id = occurrence_record.workspace_id AND is_completed
    ORDER BY position LIMIT 1;
    UPDATE public.tasks
    SET status = 'done'::public.task_status,
        status_id = coalesce(completed_status_id, status_id),
        completed_at = coalesce(completed_at, now())
    WHERE id = occurrence_record.task_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.run_obligation_cycle() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_obligation_cycle() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_obligation_occurrence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_obligation_occurrence(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
