-- Notifica quem foi adicionado como colaborador de uma tarefa.
CREATE OR REPLACE FUNCTION public.notify_task_collaborator_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := COALESCE(NEW.added_by, auth.uid());
  actor_name text;
  task_title text;
BEGIN
  -- Não cria uma notificação quando a própria pessoa se adiciona.
  IF NEW.collaborator_id = actor THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email) INTO actor_name
  FROM public.profiles WHERE id = actor;
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (
    NEW.collaborator_id,
    NEW.task_id,
    'collaborator_assignment',
    U&'Voc\00EA foi adicionado como colaborador',
    COALESCE(actor_name, U&'Algu\00E9m') || ' adicionou você como colaborador em: ' || COALESCE(task_title, 'uma tarefa')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_collaborator_added ON public.task_collaborators;
CREATE TRIGGER trg_notify_task_collaborator_added
AFTER INSERT ON public.task_collaborators
FOR EACH ROW EXECUTE FUNCTION public.notify_task_collaborator_added();