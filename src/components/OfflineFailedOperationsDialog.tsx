import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  discardFailedOfflineOperation,
  listFailedOfflineOperations,
  retryFailedOfflineOperation,
  type OfflineOperation,
} from "@/lib/offline-sync";

const entityNames: Record<string, string> = {
  task: "Tarefa",
  task_order: "Ordem das tarefas",
  subtask: "Subtarefa",
  comment: "Comentário",
  attachment: "Anexo",
  reaction: "Reação no mural",
};

const tableNames: Record<string, string> = {
  attachments: "Anexo da tarefa",
  board_preferences: "Preferências do quadro",
  calendar_events: "Evento da agenda",
  client_avatar_updates: "Foto do cliente",
  client_files: "Arquivo do cliente",
  client_note_attachments: "Anexo da nota",
  client_notes: "Nota",
  clients: "Cliente",
  comment_attachments: "Anexo do comentário",
  comments: "Comentário",
  kanban_columns: "Coluna do quadro",
  mural_post_attachments: "Anexo do mural",
  mural_post_reactions: "Reação no mural",
  mural_posts: "Publicação do mural",
  notifications: "Notificação",
  obligation_departments: "Departamento da obrigação",
  obligation_occurrences: "Ocorrência de obrigação",
  obligations: "Obrigação",
  service_request_attachments: "Anexo da solicitação",
  service_request_messages: "Mensagem da solicitação",
  service_request_participants: "Participante da solicitação",
  service_requests: "Solicitação",
  subtask_attachments: "Anexo da subtarefa",
  subtasks: "Subtarefa",
  task_statuses: "Status",
  task_tags: "Etiqueta",
  user_permissions: "Permissões de usuário",
  user_roles: "Papel de usuário",
};

const actionNames: Record<OfflineOperation["action"], string> = {
  create: "Criação",
  update: "Alteração",
  delete: "Exclusão",
};

function describe(operation: OfflineOperation) {
  const table = typeof operation.payload.table === "string" ? operation.payload.table : null;
  const kind = (table && tableNames[table]) ?? entityNames[operation.entity] ?? operation.entity;
  const source = [
    operation.payload.task,
    operation.payload.patch,
    operation.payload.record,
    operation.payload.attachment,
    operation.payload.subtask,
  ].find((value) => value && typeof value === "object") as Record<string, unknown> | undefined;
  const label = source?.title ?? source?.name ?? source?.file_name;
  return {
    title: `${actionNames[operation.action]} · ${kind}`,
    detail: typeof label === "string" && label.trim() ? label : null,
  };
}

/**
 * Mostra alterações feitas offline que o servidor recusou repetidamente.
 * Elas nunca são descartadas sozinhas: a pessoa decide tentar de novo ou descartar.
 */
export function OfflineFailedOperationsDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [operations, setOperations] = useState<OfflineOperation[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOperations([]);
      return [];
    }
    const failed = await listFailedOfflineOperations(user.id);
    setOperations(failed);
    if (failed.length === 0) setOpen(false);
    return failed;
  }, [user]);

  useEffect(() => {
    void load().then((failed) => {
      if (failed.length > 0) setOpen(true);
    });
    const reload = () => void load();
    const reveal = () => void load().then((failed) => setOpen(failed.length > 0));
    window.addEventListener("taskflow:offline-failed", reload);
    window.addEventListener("taskflow:offline-failed-open", reveal);
    return () => {
      window.removeEventListener("taskflow:offline-failed", reload);
      window.removeEventListener("taskflow:offline-failed-open", reveal);
    };
  }, [load]);

  const retry = async (operation: OfflineOperation) => {
    if (!user) return;
    setBusyId(operation.id);
    try {
      await retryFailedOfflineOperation(user.id, operation.id);
      await load();
      toast.success("A alteração voltou para a fila de sincronização.");
    } finally {
      setBusyId(null);
    }
  };

  const discard = async (operation: OfflineOperation) => {
    if (!user) return;
    setBusyId(operation.id);
    try {
      await discardFailedOfflineOperation(user.id, operation.id);
      await load();
      // Remove da tela o estado otimista que dependia desta alteração.
      await queryClient.invalidateQueries();
      toast.success("Alteração descartada.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open && operations.length > 0} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alterações não sincronizadas</DialogTitle>
          <DialogDescription>
            O servidor recusou estas alterações feitas neste aparelho. Elas continuam guardadas
            aqui, e alterações posteriores dos mesmos registros aguardam sua decisão.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] space-y-3 overflow-y-auto">
          {operations.map((operation) => {
            const { title, detail } = describe(operation);
            return (
              <li
                key={operation.id}
                className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{title}</p>
                  {detail && <p className="break-words text-muted-foreground">{detail}</p>}
                  <p className="text-xs text-muted-foreground">
                    Feita em {new Date(operation.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                {operation.lastError && (
                  <p className="break-words text-xs text-destructive">{operation.lastError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === operation.id}
                    onClick={() => void discard(operation)}
                  >
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === operation.id}
                    onClick={() => void retry(operation)}
                  >
                    Tentar novamente
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Revisar depois
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
