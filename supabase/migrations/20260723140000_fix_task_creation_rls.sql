-- O criador de uma tarefa deve sempre ser o usuário autenticado. Definir isso
-- no gatilho evita falhas de RLS ao criar uma tarefa já com responsável e
-- colaboradores, e também impede que o cliente escolha outro criador.
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
