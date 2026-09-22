
-- Board preferences (per user)
CREATE TABLE public.board_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  field_order jsonb NOT NULL DEFAULT '["tags","description","assignee","priority","status","due","subtasks","comments","attachments","interruptions"]'::jsonb,
  hidden_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  interruption_color text NOT NULL DEFAULT '#ef4444',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_preferences TO authenticated;
GRANT ALL ON public.board_preferences TO service_role;
ALTER TABLE public.board_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.board_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER board_preferences_updated_at BEFORE UPDATE ON public.board_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Task interruptions log
CREATE TABLE public.task_interruptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_interruptions TO authenticated;
GRANT ALL ON public.task_interruptions TO service_role;
ALTER TABLE public.task_interruptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth interruptions" ON public.task_interruptions FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() = user_id);
CREATE INDEX task_interruptions_task_id_idx ON public.task_interruptions(task_id);
CREATE TRIGGER task_interruptions_updated_at BEFORE UPDATE ON public.task_interruptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep tasks.interruptions in sync as a cached count
CREATE OR REPLACE FUNCTION public.sync_task_interruptions_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid;
BEGIN
  tid := COALESCE(NEW.task_id, OLD.task_id);
  UPDATE public.tasks SET interruptions = (SELECT count(*) FROM public.task_interruptions WHERE task_id = tid) WHERE id = tid;
  RETURN NULL;
END; $$;
CREATE TRIGGER task_interruptions_count_aiud
AFTER INSERT OR DELETE OR UPDATE ON public.task_interruptions
FOR EACH ROW EXECUTE FUNCTION public.sync_task_interruptions_count();
