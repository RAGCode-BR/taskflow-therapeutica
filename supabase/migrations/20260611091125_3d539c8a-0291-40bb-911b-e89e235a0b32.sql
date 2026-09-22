
-- Custom task statuses with color and "active" highlight flag
CREATE TABLE public.task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  position integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_statuses TO authenticated;
GRANT ALL ON public.task_statuses TO service_role;

ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_statuses_all_auth" ON public.task_statuses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_task_statuses_u BEFORE UPDATE ON public.task_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add status_id to tasks (custom status reference)
ALTER TABLE public.tasks ADD COLUMN status_id uuid REFERENCES public.task_statuses(id) ON DELETE SET NULL;
CREATE INDEX tasks_status_id_idx ON public.tasks(status_id);

-- Seed defaults
INSERT INTO public.task_statuses (name, color, position, is_completed, is_active) VALUES
  ('A Fazer', '#64748b', 0, false, false),
  ('Em Andamento', '#3b82f6', 1, false, true),
  ('Em Revisão', '#f59e0b', 2, false, false),
  ('Concluída', '#22c55e', 3, true, false);

-- Backfill status_id based on existing enum status
UPDATE public.tasks t SET status_id = s.id
FROM public.task_statuses s
WHERE (t.status::text = 'todo' AND s.name = 'A Fazer')
   OR (t.status::text = 'in_progress' AND s.name = 'Em Andamento')
   OR (t.status::text = 'review' AND s.name = 'Em Revisão')
   OR (t.status::text = 'done' AND s.name = 'Concluída');
