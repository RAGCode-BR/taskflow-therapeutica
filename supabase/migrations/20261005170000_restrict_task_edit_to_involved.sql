-- Editar tarefa: só os envolvidos (responsável, quem criou, colaboradores e
-- responsáveis por subtarefas) e os administradores. Todos do ambiente continuam
-- vendo as tarefas.
--
-- Usa gatilho, e não só RLS, para recusar com mensagem clara: com RLS a edição
-- seria ignorada em silêncio e a tela pareceria ter salvo.
-- Ficam liberados:
-- - rotinas internas (alterações feitas dentro de outro gatilho, ex.: concluir o
--   item da pauta conclui a tarefa automática; contagem de interrupções);
-- - encerrar/reabrir a conversa, por quem participa dela ou a supervisiona.
CREATE OR REPLACE FUNCTION public.guard_task_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ignored text[] := ARRAY['updated_at', 'conversation_closed_at'];
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF public.can_view_task(OLD.id) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - ignored) = (to_jsonb(OLD) - ignored)
    AND (
      NEW.conversation_closed_at IS NOT DISTINCT FROM OLD.conversation_closed_at
      OR public.can_access_task_conversation(OLD.id)
      OR public.can_oversee_task_conversation(OLD.id)
    )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Só os envolvidos na tarefa ou um administrador podem editá-la'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_edit ON public.tasks;
CREATE TRIGGER trg_guard_task_edit
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_edit();

REVOKE ALL ON FUNCTION public.guard_task_edit() FROM PUBLIC, anon, authenticated;
