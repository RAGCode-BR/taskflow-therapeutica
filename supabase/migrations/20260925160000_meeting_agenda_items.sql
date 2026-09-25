-- Reuniões recorrentes com pauta por reunião (decisão de 25/09/2026).
-- Cada reunião recebe uma cópia da pauta padrão (respeitando a periodicidade
-- de cada item) e cada item recebe um resultado: "Concluído" ou "Gerar
-- tarefa". Os participantes são avisados antes da reunião (sininho + pop-up).
-- Substitui o modelo em que toda pauta virava tarefa automaticamente.

-- 1. Membros dos departamentos -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obligation_department_members (
  department_id uuid NOT NULL REFERENCES public.obligation_departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (department_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_department_members TO authenticated;
GRANT ALL ON public.obligation_department_members TO service_role;
ALTER TABLE public.obligation_department_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obligation_department_members_access ON public.obligation_department_members;
CREATE POLICY obligation_department_members_access ON public.obligation_department_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.obligation_departments department
    WHERE department.id = department_id
      AND public.has_workspace_access(department.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.obligation_departments department
    WHERE department.id = department_id
      AND public.has_workspace_access(department.workspace_id)
  ));

-- 2. Participantes de cada reunião recorrente ------------------------------------
CREATE TABLE IF NOT EXISTS public.obligation_participants (
  obligation_id uuid NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (obligation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_participants TO authenticated;
GRANT ALL ON public.obligation_participants TO service_role;
ALTER TABLE public.obligation_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obligation_participants_access ON public.obligation_participants;
CREATE POLICY obligation_participants_access ON public.obligation_participants
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.obligations obligation
    WHERE obligation.id = obligation_id
      AND public.has_workspace_access(obligation.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.obligations obligation
    WHERE obligation.id = obligation_id
      AND public.has_workspace_access(obligation.workspace_id)
  ));

-- 3. Configurações novas ----------------------------------------------------------
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS reminder_days_before integer NOT NULL DEFAULT 2
    CHECK (reminder_days_before BETWEEN 0 AND 30);

-- Periodicidade de cada item da pauta padrão dentro das reuniões.
ALTER TABLE public.obligation_task_templates
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'every'
    CHECK (cadence IN ('every', 'biweekly', 'first_of_month', 'last_of_month', 'until_day')),
  ADD COLUMN IF NOT EXISTS cadence_day smallint CHECK (cadence_day BETWEEN 1 AND 31);

ALTER TABLE public.obligation_task_templates
  DROP CONSTRAINT IF EXISTS obligation_task_templates_until_day_check;
ALTER TABLE public.obligation_task_templates
  ADD CONSTRAINT obligation_task_templates_until_day_check
    CHECK (cadence <> 'until_day' OR cadence_day IS NOT NULL);

-- agenda_prepared_at: a pauta da reunião foi copiada (a partir daí não segue
-- mais a pauta padrão). reminded_at: os participantes já foram avisados.
ALTER TABLE public.obligation_occurrences
  ADD COLUMN IF NOT EXISTS agenda_prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- 4. Itens da pauta de cada reunião ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obligation_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.obligation_occurrences(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.obligation_task_templates(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  position integer NOT NULL DEFAULT 0,
  result text CHECK (result IN ('done', 'task')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS obligation_agenda_items_occurrence_idx
  ON public.obligation_agenda_items (occurrence_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS obligation_agenda_items_template_idx
  ON public.obligation_agenda_items (occurrence_id, template_id)
  WHERE template_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_agenda_items TO authenticated;
GRANT ALL ON public.obligation_agenda_items TO service_role;
ALTER TABLE public.obligation_agenda_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obligation_agenda_items_access ON public.obligation_agenda_items;
CREATE POLICY obligation_agenda_items_access ON public.obligation_agenda_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.obligation_occurrences occurrence
    WHERE occurrence.id = occurrence_id
      AND public.has_workspace_access(occurrence.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.obligation_occurrences occurrence
    WHERE occurrence.id = occurrence_id
      AND public.has_workspace_access(occurrence.workspace_id)
  ));

DROP TRIGGER IF EXISTS trg_obligation_agenda_items_updated_at ON public.obligation_agenda_items;
CREATE TRIGGER trg_obligation_agenda_items_updated_at
  BEFORE UPDATE ON public.obligation_agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prepare_obligation_agenda_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF;
  NEW.title := trim(NEW.title);
  IF NEW.result IS NULL THEN
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.result IS DISTINCT FROM OLD.result THEN
    NEW.resolved_by := coalesce(auth.uid(), NEW.resolved_by);
    NEW.resolved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_obligation_agenda_item ON public.obligation_agenda_items;
CREATE TRIGGER trg_prepare_obligation_agenda_item
  BEFORE INSERT OR UPDATE ON public.obligation_agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.prepare_obligation_agenda_item();

-- Tarefas criadas a partir de um item (um item pode gerar várias).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS obligation_agenda_item_id uuid
    REFERENCES public.obligation_agenda_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_obligation_agenda_item_idx
  ON public.tasks (obligation_agenda_item_id)
  WHERE obligation_agenda_item_id IS NOT NULL;

-- Criar uma tarefa pelo item já marca o resultado como "Gerar tarefa".
CREATE OR REPLACE FUNCTION public.mark_agenda_item_with_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.obligation_agenda_item_id IS NOT NULL THEN
    UPDATE public.obligation_agenda_items
    SET result = 'task'
    WHERE id = NEW.obligation_agenda_item_id
      AND result IS DISTINCT FROM 'task';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_agenda_item_with_task ON public.tasks;
CREATE TRIGGER trg_mark_agenda_item_with_task
  AFTER INSERT OR UPDATE OF obligation_agenda_item_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.mark_agenda_item_with_task();

-- Avisos de reunião apontam para a reunião.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS obligation_occurrence_id uuid
    REFERENCES public.obligation_occurrences(id) ON DELETE CASCADE;

-- 5. Qual item da pauta padrão entra em cada reunião --------------------------------
CREATE OR REPLACE FUNCTION public.obligation_template_applies(
  obligation public.obligations,
  template public.obligation_task_templates,
  meeting_date date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  month_start date := date_trunc('month', meeting_date)::date;
  month_end date := (date_trunc('month', meeting_date) + interval '1 month - 1 day')::date;
  limit_date date;
BEGIN
  IF template.cadence = 'every' THEN RETURN true; END IF;

  IF template.cadence = 'biweekly' THEN
    RETURN mod(
      (date_trunc('week', meeting_date)::date - date_trunc('week', obligation.start_date)::date) / 7,
      2
    ) = 0;
  END IF;

  IF template.cadence = 'first_of_month' THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM generate_series(month_start, meeting_date - 1, interval '1 day') day_value
      WHERE public.obligation_matches_date(obligation, day_value::date)
    );
  END IF;

  IF template.cadence = 'last_of_month' THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM generate_series(meeting_date + 1, month_end, interval '1 day') day_value
      WHERE public.obligation_matches_date(obligation, day_value::date)
    );
  END IF;

  -- until_day: a última reunião que acontece até o dia X do mês.
  limit_date := make_date(
    extract(year FROM meeting_date)::integer,
    extract(month FROM meeting_date)::integer,
    least(template.cadence_day, extract(day FROM month_end)::integer)
  );
  RETURN meeting_date <= limit_date AND NOT EXISTS (
    SELECT 1 FROM generate_series(meeting_date + 1, limit_date, interval '1 day') day_value
    WHERE public.obligation_matches_date(obligation, day_value::date)
  );
END;
$$;

-- Pauta que a reunião terá, calculada a partir da pauta padrão (antes de ser copiada).
CREATE OR REPLACE FUNCTION public.obligation_agenda_preview(target_occurrence_id uuid)
RETURNS TABLE (template_id uuid, title text, "position" integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  occurrence_record public.obligation_occurrences%ROWTYPE;
  obligation_record public.obligations%ROWTYPE;
BEGIN
  SELECT * INTO occurrence_record FROM public.obligation_occurrences WHERE id = target_occurrence_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_workspace_access(occurrence_record.workspace_id) THEN
    RAISE EXCEPTION 'Você não pode acessar esta reunião';
  END IF;
  SELECT * INTO obligation_record FROM public.obligations WHERE id = occurrence_record.obligation_id;

  RETURN QUERY
  SELECT template.id, template.title, (row_number() OVER (
    ORDER BY template.position, template.created_at
  ) - 1)::integer
  FROM public.obligation_task_templates template
  WHERE template.obligation_id = obligation_record.id
    AND public.obligation_template_applies(obligation_record, template, occurrence_record.due_date)
  ORDER BY template.position, template.created_at;
END;
$$;

-- Copia a pauta padrão para a reunião. Depois disso a reunião tem pauta própria.
CREATE OR REPLACE FUNCTION public.prepare_obligation_agenda(target_occurrence_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  occurrence_record public.obligation_occurrences%ROWTYPE;
  inserted_count integer;
BEGIN
  SELECT * INTO occurrence_record
  FROM public.obligation_occurrences
  WHERE id = target_occurrence_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reunião não encontrada'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_workspace_access(occurrence_record.workspace_id) THEN
    RAISE EXCEPTION 'Você não pode alterar esta reunião';
  END IF;
  IF occurrence_record.agenda_prepared_at IS NOT NULL THEN RETURN 0; END IF;

  INSERT INTO public.obligation_agenda_items (occurrence_id, template_id, title, position)
  SELECT target_occurrence_id, preview.template_id, preview.title, preview.position
  FROM public.obligation_agenda_preview(target_occurrence_id) preview
  ON CONFLICT (occurrence_id, template_id) WHERE template_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE public.obligation_occurrences
  SET agenda_prepared_at = now()
  WHERE id = target_occurrence_id;
  RETURN inserted_count;
END;
$$;

-- 6. Geração das reuniões: volta a versão de 23/09 (sem criar tarefas pelas pautas).
CREATE OR REPLACE FUNCTION public.materialize_obligations(p_horizon_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obligation_record public.obligations%ROWTYPE;
  candidate date;
  generated_count integer := 0;
  inserted_count integer;
  occurrence_record record;
BEGIN
  p_horizon_days := greatest(30, least(coalesce(p_horizon_days, 180), 730));

  FOR obligation_record IN
    SELECT * FROM public.obligations obligation
    WHERE obligation.is_active
      AND (auth.uid() IS NULL OR obligation.workspace_id = public.current_workspace_id())
  LOOP
    FOR candidate IN
      SELECT day_value::date
      FROM generate_series(
        greatest(CURRENT_DATE, obligation_record.start_date)::timestamp,
        least(
          CURRENT_DATE + p_horizon_days,
          coalesce(obligation_record.end_date, CURRENT_DATE + p_horizon_days)
        )::timestamp,
        interval '1 day'
      ) day_value
    LOOP
      IF public.obligation_matches_date(obligation_record, candidate) THEN
        INSERT INTO public.obligation_occurrences (
          workspace_id, obligation_id, due_date, due_time
        ) VALUES (
          obligation_record.workspace_id,
          obligation_record.id,
          candidate,
          obligation_record.due_time
        )
        ON CONFLICT (obligation_id, due_date) DO NOTHING;
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
        generated_count := generated_count + inserted_count;
      END IF;
    END LOOP;
  END LOOP;

  FOR occurrence_record IN
    SELECT occurrence.id
    FROM public.obligation_occurrences occurrence
    JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
    WHERE occurrence.task_id IS NULL
      AND occurrence.status = 'scheduled'
      AND obligation.is_active
      AND NOT obligation.meeting_mode
      AND occurrence.due_date - obligation.create_before_days <= CURRENT_DATE
      AND (auth.uid() IS NULL OR occurrence.workspace_id = public.current_workspace_id())
    ORDER BY occurrence.due_date
  LOOP
    PERFORM public.create_obligation_task(occurrence_record.id);
  END LOOP;

  RETURN generated_count;
END;
$$;

-- Reuniões com pauta já copiada ou editada não são descartadas ao editar a recorrência.
CREATE OR REPLACE FUNCTION public.refresh_obligation(target_obligation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_workspace uuid;
BEGIN
  SELECT workspace_id INTO target_workspace FROM public.obligations WHERE id = target_obligation_id;
  IF target_workspace IS NULL THEN RAISE EXCEPTION 'Obrigação não encontrada'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_workspace_access(target_workspace) THEN
    RAISE EXCEPTION 'Você não pode atualizar esta obrigação';
  END IF;

  DELETE FROM public.obligation_occurrences
  WHERE obligation_id = target_obligation_id
    AND task_id IS NULL
    AND status = 'scheduled'
    AND agenda_prepared_at IS NULL
    AND due_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  RETURN public.run_obligation_cycle();
END;
$$;

-- 7. Rotina diária: gera reuniões, copia pautas e avisa os participantes ------------
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

  RETURN reminded_count;
END;
$$;

-- 8. Encerrar exige resultado em todos os itens (as tarefas seguem à parte) ---------
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
    PERFORM public.prepare_obligation_agenda(target_occurrence_id);
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

REVOKE ALL ON FUNCTION public.obligation_agenda_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obligation_agenda_preview(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_obligation_agenda(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_obligation_agenda(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_obligation_cycle() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_obligation_cycle() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_obligation_agenda_item() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_agenda_item_with_task() FROM PUBLIC, anon, authenticated;

-- 9. Dados da Therapeutica (decisão de 25/09/2026) ----------------------------------
-- As tarefas geradas automaticamente pelas pautas vão para a lixeira.
UPDATE public.tasks task
SET deleted_at = now(),
    deleted_by = obligation.created_by
FROM public.obligation_occurrences occurrence
JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
WHERE task.obligation_occurrence_id = occurrence.id
  AND task.obligation_template_id IS NOT NULL
  AND task.deleted_at IS NULL;

-- As rotinas de segunda a sexta viram reuniões semanais às segundas.
UPDATE public.obligations
SET frequency = 'weekly',
    interval_count = 1,
    days_of_week = ARRAY[1]::smallint[],
    title = replace(title, 'Rotina diária — ', 'Reunião — ')
WHERE title LIKE 'Rotina diária — %';

DELETE FROM public.obligation_occurrences occurrence
USING public.obligations obligation
WHERE obligation.id = occurrence.obligation_id
  AND obligation.title LIKE 'Reunião — %';

-- O responsável de cada reunião entra como participante.
INSERT INTO public.obligation_participants (obligation_id, user_id)
SELECT id, assignee_id FROM public.obligations
WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Itens que não são semanais.
UPDATE public.obligation_task_templates
SET cadence = 'until_day', cadence_day = 25
WHERE title ILIKE '%ATÉ 25 DE CADA MÊS%';
UPDATE public.obligation_task_templates
SET cadence = 'first_of_month'
WHERE title ILIKE 'ROTINA MENSAL:%';

-- Atualização ao vivo da tela de Obrigações.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'obligation_agenda_items'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.obligation_agenda_items;
  END IF;
END $$;

-- 10. Agendamento diário às 07:00 de Brasília (10:00 UTC) ------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'taskflow-obligation-cycle';
SELECT cron.schedule(
  'taskflow-obligation-cycle',
  '0 10 * * *',
  'SELECT public.run_obligation_cycle()'
);

SELECT public.run_obligation_cycle();

NOTIFY pgrst, 'reload schema';
