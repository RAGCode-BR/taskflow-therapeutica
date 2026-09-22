
-- Allow tasks to have no status and no priority
ALTER TABLE public.tasks ALTER COLUMN status DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN priority DROP NOT NULL;

-- Add due_date to subtasks
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Subtask due-date change log
CREATE TABLE IF NOT EXISTS public.subtask_due_date_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  old_due_date TIMESTAMPTZ,
  new_due_date TIMESTAMPTZ,
  reason TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtask_due_date_changes TO authenticated;
GRANT ALL ON public.subtask_due_date_changes TO service_role;

ALTER TABLE public.subtask_due_date_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View subtask due changes for viewable tasks"
  ON public.subtask_due_date_changes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      WHERE s.id = subtask_due_date_changes.subtask_id
        AND public.can_view_task(s.task_id)
    )
  );

CREATE POLICY "Insert subtask due changes for viewable tasks"
  ON public.subtask_due_date_changes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      WHERE s.id = subtask_due_date_changes.subtask_id
        AND public.can_view_task(s.task_id)
    )
  );

CREATE POLICY "Delete own subtask due changes"
  ON public.subtask_due_date_changes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_subtask_due_date_changes_subtask ON public.subtask_due_date_changes(subtask_id, created_at DESC);
