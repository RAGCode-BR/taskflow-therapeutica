-- Pautas padrão das reuniões de departamento.
-- Cada obrigação pode ter uma lista de tarefas que toda reunião gerada recebe
-- automaticamente, sem precisar criá-las uma a uma em cada ocorrência.

CREATE TABLE IF NOT EXISTS public.obligation_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS obligation_task_templates_obligation_idx
  ON public.obligation_task_templates (obligation_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_task_templates TO authenticated;
GRANT ALL ON public.obligation_task_templates TO service_role;

ALTER TABLE public.obligation_task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS obligation_task_templates_workspace_access ON public.obligation_task_templates;
CREATE POLICY obligation_task_templates_workspace_access ON public.obligation_task_templates
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

DROP TRIGGER IF EXISTS trg_obligation_task_templates_updated_at ON public.obligation_task_templates;
CREATE TRIGGER trg_obligation_task_templates_updated_at
  BEFORE UPDATE ON public.obligation_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prepare_obligation_task_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF;
  NEW.title := trim(NEW.title);
  NEW.description := nullif(trim(coalesce(NEW.description, '')), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_obligation_task_template ON public.obligation_task_templates;
CREATE TRIGGER trg_prepare_obligation_task_template
  BEFORE INSERT OR UPDATE ON public.obligation_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.prepare_obligation_task_template();

-- Liga a tarefa à pauta padrão que a originou. Remover a pauta padrão mantém
-- as tarefas já criadas nas reuniões.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS obligation_template_id uuid
    REFERENCES public.obligation_task_templates(id) ON DELETE SET NULL;

-- Uma pauta padrão gera no máximo uma tarefa por reunião, mesmo com execuções
-- simultâneas. Tarefas excluídas (lixeira) também contam: não são recriadas.
CREATE UNIQUE INDEX IF NOT EXISTS tasks_obligation_template_occurrence_idx
  ON public.tasks (obligation_occurrence_id, obligation_template_id)
  WHERE obligation_occurrence_id IS NOT NULL AND obligation_template_id IS NOT NULL;

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
      coalesce(template_record.priority, obligation_record.priority),
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

REVOKE ALL ON FUNCTION public.create_obligation_template_tasks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_obligation_template_tasks(uuid) TO authenticated, service_role;

-- Mesma geração de reuniões da migration anterior, acrescida das pautas padrão.
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
  local_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
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

  -- Reuniões recebem as pautas padrão quando entram na janela de antecedência.
  -- Só reuniões de hoje em diante: incluir uma pauta nova não altera o histórico.
  FOR occurrence_record IN
    SELECT occurrence.id
    FROM public.obligation_occurrences occurrence
    JOIN public.obligations obligation ON obligation.id = occurrence.obligation_id
    WHERE occurrence.status IN ('scheduled', 'open')
      AND obligation.is_active
      AND obligation.meeting_mode
      AND occurrence.due_date >= local_today
      AND occurrence.due_date - obligation.create_before_days <= local_today
      AND EXISTS (
        SELECT 1 FROM public.obligation_task_templates template
        WHERE template.obligation_id = obligation.id
      )
      AND (auth.uid() IS NULL OR occurrence.workspace_id = public.current_workspace_id())
    ORDER BY occurrence.due_date
  LOOP
    PERFORM public.create_obligation_template_tasks(occurrence_record.id);
  END LOOP;

  RETURN generated_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
