-- As tarefas da reunião deixam de ser criadas automaticamente: os usuários geram
-- as tarefas pela reunião ("Gerar tarefa"). A opção continua no formulário,
-- desligada; quem quiser pode ligar numa reunião específica.
UPDATE public.obligations
SET auto_create_tasks = false
WHERE auto_create_tasks;

-- Tarefas automáticas ainda abertas vão para a lixeira (dá para restaurar).
-- As já concluídas ficam como histórico.
UPDATE public.tasks
SET deleted_at = now()
WHERE obligation_auto_task
  AND deleted_at IS NULL
  AND completed_at IS NULL
  AND status IS DISTINCT FROM 'done'::public.task_status;
