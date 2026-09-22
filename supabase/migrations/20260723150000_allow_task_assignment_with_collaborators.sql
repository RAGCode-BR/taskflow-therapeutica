-- A política anterior avaliava a tarefa após trocar o responsável. Quando o
-- usuário que estava salvando deixava de ser o responsável, o UPDATE era
-- negado antes que os colaboradores fossem gravados.
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.can_view_task(id))
  WITH CHECK (auth.uid() IS NOT NULL);

-- O gatilho set_task_created_by fixa o criador para auth.uid(); portanto a
-- inserção pode ser aceita para toda sessão autenticada sem depender do valor
-- enviado pelo formulário.
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);
