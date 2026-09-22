ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.subtasks SET completed_at = now() WHERE done = true AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_subtask_completed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.done AND (TG_OP = 'INSERT' OR OLD.done IS DISTINCT FROM NEW.done) THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NOT NEW.done THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_subtask_completed_at ON public.subtasks;
CREATE TRIGGER trg_sync_subtask_completed_at
BEFORE INSERT OR UPDATE ON public.subtasks
FOR EACH ROW EXECUTE FUNCTION public.sync_subtask_completed_at();