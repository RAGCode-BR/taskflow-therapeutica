-- Concluir qualquer tarefa falhava com "Direct deletion from storage tables is
-- not allowed": o Supabase bloqueia todo DELETE direto em storage.objects (o
-- gatilho protect_objects_delete dispara por comando, mesmo sem linhas).
-- Agora só mexe no storage quando a tarefa tem anexos de conversa, liberando o
-- DELETE apenas dentro desta transação.
CREATE OR REPLACE FUNCTION public.delete_completed_task_conversation_attachments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  was_completed boolean := OLD.status = 'done'::public.task_status OR OLD.completed_at IS NOT NULL;
  is_completed boolean := NEW.status = 'done'::public.task_status OR NEW.completed_at IS NOT NULL;
BEGIN
  IF was_completed OR NOT is_completed THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.comment_attachments WHERE task_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Apaga primeiro o registro do arquivo privado e depois o anexo da conversa.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects AS object
  USING public.comment_attachments AS attachment
  WHERE attachment.task_id = NEW.id
    AND object.bucket_id = 'task-attachments'
    AND object.name = attachment.storage_path;
  PERFORM set_config('storage.allow_delete_query', 'false', true);

  DELETE FROM public.comment_attachments
  WHERE task_id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_completed_task_conversation_attachments() FROM PUBLIC, anon, authenticated;
