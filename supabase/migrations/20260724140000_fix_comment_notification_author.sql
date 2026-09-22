-- Comments are authored through author_id, not created_by.
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
  IF t.assignee_id IS NULL OR t.assignee_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email) INTO author_name
  FROM public.profiles
  WHERE id = NEW.author_id;

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