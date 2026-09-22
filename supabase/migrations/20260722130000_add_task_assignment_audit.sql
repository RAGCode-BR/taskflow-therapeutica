ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Tarefas antigas não possuem o histórico de atribuição. Usa o criador como
-- melhor informação disponível quando já existe um responsável.
UPDATE public.tasks
SET assigned_by = created_by,
    assigned_at = COALESCE(updated_at, created_at)
WHERE assignee_id IS NOT NULL
  AND assigned_by IS NULL;

CREATE OR REPLACE FUNCTION public.track_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;

  IF NEW.assignee_id IS NULL THEN
    NEW.assigned_by := NULL;
    NEW.assigned_at := NULL;
  ELSIF actor IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM actor THEN
    NEW.assigned_by := actor;
    NEW.assigned_at := now();
  ELSE
    NEW.assigned_by := NULL;
    NEW.assigned_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_task_assignment ON public.tasks;
CREATE TRIGGER trg_track_task_assignment
BEFORE INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.track_task_assignment();
