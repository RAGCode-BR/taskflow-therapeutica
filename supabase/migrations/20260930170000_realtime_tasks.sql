-- As telas de tarefas passam a ouvir mudanças em tempo real: quando um
-- participante conclui uma tarefa, ela sai também da tela dos demais.
-- O Realtime respeita o RLS: cada usuário só recebe as tarefas que pode ver.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_collaborators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_collaborators;
  END IF;
END $$;
