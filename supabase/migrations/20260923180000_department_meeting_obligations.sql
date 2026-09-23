-- Evolui Obrigações para rotinas de reunião por departamento.
-- Uma ocorrência passa a representar uma reunião e pode possuir várias tarefas/pautas.
-- Os campos legados são preservados para que nenhum histórico seja perdido.

CREATE TABLE IF NOT EXISTS public.obligation_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  color text NOT NULL DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS obligation_departments_workspace_name_idx
  ON public.obligation_departments (workspace_id, lower(trim(name)));
CREATE INDEX IF NOT EXISTS obligation_departments_workspace_position_idx
  ON public.obligation_departments (workspace_id, position, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_departments TO authenticated;
GRANT ALL ON public.obligation_departments TO service_role;

ALTER TABLE public.obligation_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obligation_departments_workspace_access ON public.obligation_departments;
CREATE POLICY obligation_departments_workspace_access ON public.obligation_departments
  FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

DROP TRIGGER IF EXISTS trg_obligation_departments_assign_workspace ON public.obligation_departments;
CREATE TRIGGER trg_obligation_departments_assign_workspace
  BEFORE INSERT OR UPDATE OF workspace_id ON public.obligation_departments
  FOR EACH ROW EXECUTE FUNCTION public.assign_current_workspace();

DROP TRIGGER IF EXISTS trg_obligation_departments_updated_at ON public.obligation_departments;
CREATE TRIGGER trg_obligation_departments_updated_at
  BEFORE UPDATE ON public.obligation_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS department_id uuid
    REFERENCES public.obligation_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meeting_mode boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS obligations_department_idx
  ON public.obligations (department_id, is_active);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS obligation_occurrence_id uuid
    REFERENCES public.obligation_occurrences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_obligation_occurrence_idx
  ON public.tasks (obligation_occurrence_id)
  WHERE obligation_occurrence_id IS NOT NULL;

-- A tarefa única criada pelo modelo antigo passa a ser a primeira pauta da reunião.
UPDATE public.tasks task
SET obligation_occurrence_id = occurrence.id
FROM public.obligation_occurrences occurrence
WHERE occurrence.task_id = task.id
  AND task.obligation_occurrence_id IS NULL;

CREATE OR REPLACE FUNCTION public.prepare_obligation_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.workspace_id IS NULL THEN NEW.workspace_id := public.current_workspace_id(); END IF;
  END IF;
  NEW.name := trim(NEW.name);
  NEW.description := nullif(trim(coalesce(NEW.description, '')), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_obligation_department ON public.obligation_departments;
CREATE TRIGGER trg_prepare_obligation_department
  BEFORE INSERT OR UPDATE ON public.obligation_departments
  FOR EACH ROW EXECUTE FUNCTION public.prepare_obligation_department();

CREATE OR REPLACE FUNCTION public.validate_obligation_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.obligation_departments department
    WHERE department.id = NEW.department_id
      AND department.workspace_id = NEW.workspace_id
      AND department.is_active
  ) THEN
    RAISE EXCEPTION 'O departamento não pertence ao ambiente atual ou está inativo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_obligation_department ON public.obligations;
CREATE TRIGGER trg_validate_obligation_department
  BEFORE INSERT OR UPDATE OF department_id, workspace_id ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION public.validate_obligation_department();

-- A materialização continua calculando reuniões, mas não cria uma tarefa genérica
-- para rotinas no novo modo. As pautas são criadas dentro de cada reunião.
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

-- Toda tarefa criada como pauta abre a reunião. A reunião é concluída
-- automaticamente apenas quando possui pautas e todas elas estão concluídas.
CREATE OR REPLACE FUNCTION public.sync_obligation_meeting_from_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_occurrence uuid := coalesce(NEW.obligation_occurrence_id, OLD.obligation_occurrence_id);
  task_count integer;
  pending_count integer;
BEGIN
  IF target_occurrence IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) FILTER (
    WHERE task.deleted_at IS NULL AND task.archived_at IS NULL
  ), count(*) FILTER (
    WHERE task.deleted_at IS NULL
      AND task.archived_at IS NULL
      AND NOT (
        task.completed_at IS NOT NULL
        OR task.status = 'done'::public.task_status
        OR EXISTS (
          SELECT 1 FROM public.task_statuses status
          WHERE status.id = task.status_id AND status.is_completed
        )
      )
  )
  INTO task_count, pending_count
  FROM public.tasks task
  WHERE task.obligation_occurrence_id = target_occurrence;

  UPDATE public.obligation_occurrences
  SET status = CASE
        WHEN task_count > 0 AND pending_count = 0 THEN 'completed'
        ELSE 'open'
      END,
      completed_at = CASE
        WHEN task_count > 0 AND pending_count = 0 THEN coalesce(completed_at, now())
        ELSE NULL
      END,
      completed_by = CASE
        WHEN task_count > 0 AND pending_count = 0 THEN coalesce(completed_by, auth.uid())
        ELSE NULL
      END
  WHERE id = target_occurrence AND status <> 'skipped';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_obligation_meeting_from_task ON public.tasks;
CREATE TRIGGER trg_sync_obligation_meeting_from_task
  AFTER INSERT OR UPDATE OF status, status_id, completed_at, deleted_at, archived_at,
    obligation_occurrence_id
  ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_obligation_meeting_from_task();

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

  IF occurrence_record.meeting_mode AND EXISTS (
    SELECT 1
    FROM public.tasks task
    WHERE task.obligation_occurrence_id = target_occurrence_id
      AND task.deleted_at IS NULL
      AND task.archived_at IS NULL
      AND NOT (
        task.completed_at IS NOT NULL
        OR task.status = 'done'::public.task_status
        OR EXISTS (
          SELECT 1 FROM public.task_statuses status
          WHERE status.id = task.status_id AND status.is_completed
        )
      )
  ) THEN
    RAISE EXCEPTION 'Conclua ou remova as pautas pendentes antes de encerrar a reunião';
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

REVOKE ALL ON FUNCTION public.prepare_obligation_department() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_obligation_department() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.obligation_departments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
