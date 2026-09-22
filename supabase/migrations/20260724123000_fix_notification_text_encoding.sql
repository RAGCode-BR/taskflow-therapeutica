-- Recria as mensagens de notificações usando escapes Unicode e corrige os registros existentes.
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid(); assigner_name text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;
  IF NEW.assignee_id = actor THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email) INTO assigner_name FROM public.profiles WHERE id = actor;
  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (NEW.assignee_id, NEW.id, 'assignment',
    U&'Nova tarefa atribu\00EDda a voc\00EA',
    COALESCE(assigner_name, U&'Algu\00E9m') || ' atribuiu: ' || NEW.title);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; author_name text;
BEGIN
  SELECT id, title, assignee_id INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t.assignee_id IS NULL OR t.assignee_id = NEW.created_by THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email) INTO author_name FROM public.profiles WHERE id = NEW.created_by;
  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (t.assignee_id, t.id, 'comment', U&'Nova observa\00E7\00E3o em sua tarefa',
    COALESCE(author_name, U&'Algu\00E9m') || ' comentou em: ' || t.title);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_task_attachment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; uploader_name text;
BEGIN
  SELECT id, title, assignee_id INTO t FROM public.tasks WHERE id = NEW.task_id;
  IF t.assignee_id IS NULL OR t.assignee_id = NEW.uploaded_by THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email) INTO uploader_name FROM public.profiles WHERE id = NEW.uploaded_by;
  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (t.assignee_id, t.id, 'attachment', 'Novo arquivo em sua tarefa',
    COALESCE(uploader_name, U&'Algu\00E9m') || ' anexou "' || NEW.file_name || '" em: ' || t.title);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_subtask_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid(); assigner_name text; task_title text; clean_title text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;
  IF NEW.assignee_id = actor THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email) INTO assigner_name FROM public.profiles WHERE id = actor;
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
  clean_title := regexp_replace(COALESCE(NEW.title, ''), '<[^>]+>', '', 'g');
  INSERT INTO public.notifications (user_id, task_id, type, title, body)
  VALUES (NEW.assignee_id, NEW.task_id, 'subtask_assignment',
    U&'Nova subtarefa atribu\00EDda a voc\00EA',
    COALESCE(assigner_name, U&'Algu\00E9m') || ' atribuiu a subtarefa "' || clean_title || '"' ||
    CASE WHEN task_title IS NOT NULL THEN ' em: ' || task_title ELSE '' END);
  RETURN NEW;
END; $$;

UPDATE public.notifications
SET title = public.fix_ptbr_mojibake(title), body = public.fix_ptbr_mojibake(body)
WHERE position(chr(195) IN COALESCE(title, '')) > 0
   OR position(chr(194) IN COALESCE(title, '')) > 0
   OR position(chr(226) IN COALESCE(title, '')) > 0
   OR position(chr(195) IN COALESCE(body, '')) > 0
   OR position(chr(194) IN COALESCE(body, '')) > 0
   OR position(chr(226) IN COALESCE(body, '')) > 0;