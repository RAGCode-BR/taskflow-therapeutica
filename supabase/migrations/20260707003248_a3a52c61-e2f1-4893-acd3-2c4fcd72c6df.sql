-- 1) Histórico de mudanças de prazo (com justificativa opcional)
CREATE TABLE public.task_due_date_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_due_date timestamptz,
  new_due_date timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_due_date_changes TO authenticated;
GRANT ALL ON public.task_due_date_changes TO service_role;

ALTER TABLE public.task_due_date_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view due changes for accessible tasks"
  ON public.task_due_date_changes FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

CREATE POLICY "insert due changes for accessible tasks"
  ON public.task_due_date_changes FOR INSERT TO authenticated
  WITH CHECK (public.can_view_task(task_id) AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "update own due changes"
  ON public.task_due_date_changes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete own due changes"
  ON public.task_due_date_changes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_task_due_changes_task ON public.task_due_date_changes(task_id, created_at DESC);

-- 2) Subtarefa vinculada opcionalmente a uma seção dobrável (comments)
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_subtasks_comment ON public.subtasks(comment_id);
