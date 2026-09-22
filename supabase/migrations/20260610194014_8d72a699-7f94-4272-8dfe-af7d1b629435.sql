CREATE TABLE public.task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_tags TO authenticated;
GRANT ALL ON public.task_tags TO service_role;

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_all_auth" ON public.task_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_tags_u BEFORE UPDATE ON public.task_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tag_id uuid REFERENCES public.task_tags(id) ON DELETE SET NULL;