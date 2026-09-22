
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notifs_select" ON public.notifications;
CREATE POLICY "own_notifs_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_notifs_update" ON public.notifications;
CREATE POLICY "own_notifs_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_notifs_delete" ON public.notifications;
CREATE POLICY "own_notifs_delete" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- allow system triggers (SECURITY DEFINER functions) to insert; also allow
-- authenticated inserts scoped to any user because triggers run as the caller
DROP POLICY IF EXISTS "notifs_insert_any" ON public.notifications;
CREATE POLICY "notifs_insert_any" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: notify assignee when a task is assigned (or reassigned) to someone
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  assigner_name text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;
  IF NEW.assignee_id = actor THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email) INTO assigner_name FROM public.profiles WHERE id = actor;

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    NEW.assignee_id,
    NEW.id,
    'assignment',
    'Nova tarefa atribuída a você',
    COALESCE(assigner_name, 'Alguém') || ' atribuiu: ' || NEW.title
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.tasks;
CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger: notify assignee on new comment (if author != assignee)
CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  author_name text;
BEGIN
  SELECT id, title, assignee_id INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t.assignee_id IS NULL OR t.assignee_id = NEW.created_by THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email) INTO author_name FROM public.profiles WHERE id = NEW.created_by;

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    t.assignee_id,
    t.id,
    'comment',
    'Nova observação em sua tarefa',
    COALESCE(author_name, 'Alguém') || ' comentou em: ' || t.title
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.comments;
CREATE TRIGGER trg_notify_task_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

-- Trigger: notify assignee on new attachment (if uploader != assignee)
CREATE OR REPLACE FUNCTION public.notify_task_attachment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  uploader_name text;
BEGIN
  SELECT id, title, assignee_id INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t.assignee_id IS NULL OR t.assignee_id = NEW.uploaded_by THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email) INTO uploader_name FROM public.profiles WHERE id = NEW.uploaded_by;

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    t.assignee_id,
    t.id,
    'attachment',
    'Novo arquivo em sua tarefa',
    COALESCE(uploader_name, 'Alguém') || ' anexou "' || NEW.file_name || '" em: ' || t.title
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_attachment ON public.attachments;
CREATE TRIGGER trg_notify_task_attachment
AFTER INSERT ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.notify_task_attachment();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
