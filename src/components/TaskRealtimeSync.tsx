import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mantém as tarefas atualizadas entre usuários: quando alguém conclui, edita ou
 * inclui colaboradores numa tarefa, as telas de quem participa dela se
 * atualizam sem recarregar a página. Montado uma única vez no AppShell.
 */
export function TaskRealtimeSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Várias mudanças seguidas (ex.: tarefas criadas pela pauta) geram uma só recarga.
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["task_collaborators"] });
      }, 400);
    };

    const channel = supabase
      .channel(`tasks-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_collaborators" },
        refresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return null;
}
