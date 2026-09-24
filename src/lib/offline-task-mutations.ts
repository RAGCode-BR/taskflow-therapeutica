import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/hooks/use-data";
import {
  enqueueOfflineOperation,
  isNetworkFailure,
  isOffline,
  listFailedOfflineOperations,
  listOfflineOperations,
} from "@/lib/offline-sync";

type TaskPatch = Partial<Task>;

function updateLocalTask(queryClient: QueryClient, taskId: string, patch: TaskPatch) {
  queryClient.setQueryData<Task[]>(["tasks"], (current = []) =>
    current.map((item) => (item.id === taskId ? ({ ...item, ...patch } as Task) : item)),
  );
}

/** Há alteração local desta tarefa ainda não confirmada pelo servidor? */
async function hasUnsyncedTaskChanges(userId: string, taskId: string) {
  const [queued, failed] = await Promise.all([
    listOfflineOperations(userId),
    listFailedOfflineOperations(userId),
  ]);
  return [...queued, ...failed].some((operation) => operation.entityId === taskId);
}

/**
 * Persiste uma edição de tarefa ou a mantém na fila local quando não há rede.
 * `baseValues` é guardado para que a sincronização posterior possa unir campos
 * diferentes alterados em aparelhos distintos.
 */
export async function updateTaskWithOfflineSupport({
  userId,
  task,
  patch,
  queryClient,
  forceQueue = false,
}: {
  userId: string;
  task: Task;
  patch: TaskPatch;
  queryClient: QueryClient;
  forceQueue?: boolean;
}) {
  // Com edições desta tarefa ainda na fila, grave também pela fila: gravar
  // direto passaria na frente delas e a edição antiga voltaria por cima.
  const mustQueue = forceQueue || isOffline() || (await hasUnsyncedTaskChanges(userId, task.id));
  if (!mustQueue) {
    const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
    if (!error) return { queued: false };
    // `navigator.onLine` pode continuar verdadeiro sem internet de fato.
    if (!isNetworkFailure(error)) throw error;
  }

  updateLocalTask(queryClient, task.id, patch);
  const baseValues = Object.fromEntries(Object.keys(patch).map((key) => [key, task[key as keyof Task]]));
  await enqueueOfflineOperation({
    userId,
    entity: "task",
    action: "update",
    entityId: task.id,
    payload: { patch },
    baseUpdatedAt: task.updated_at ?? null,
    baseValues,
  });
  return { queued: true };
}

export async function deleteTaskWithOfflineSupport({
  userId,
  task,
  queryClient,
}: {
  userId: string;
  task: Task;
  queryClient: QueryClient;
}) {
  const wasOffline = isOffline();
  const patch: TaskPatch = {
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
  };
  queryClient.setQueryData<Task[]>(["tasks"], (current = []) => current.filter((item) => item.id !== task.id));
  const baseValues = Object.fromEntries(Object.keys(patch).map((key) => [key, task[key as keyof Task]]));
  await enqueueOfflineOperation({
    userId,
    entity: "task",
    action: "update",
    entityId: task.id,
    payload: { patch },
    baseUpdatedAt: task.updated_at ?? null,
    baseValues,
  });
  return { queued: wasOffline };
}

export async function createTaskWithOfflineSupport({
  userId,
  task,
  queryClient,
}: {
  userId: string;
  task: Task;
  queryClient: QueryClient;
}) {
  queryClient.setQueryData<Task[]>(["tasks"], (current = []) => [...current, task]);
  await enqueueOfflineOperation({
    userId,
    entity: "task",
    action: "create",
    entityId: task.id,
    payload: { task },
  });
}

export async function createSubtaskWithOfflineSupport({
  userId,
  subtask,
  queryClient,
}: {
  userId: string;
  subtask: Record<string, unknown>;
  queryClient: QueryClient;
}) {
  queryClient.setQueryData<Record<string, unknown>[]>(["subtasks"], (current = []) => [...current, subtask]);
  await enqueueOfflineOperation({
    userId,
    entity: "subtask",
    action: "create",
    entityId: String(subtask.id),
    payload: { subtask },
  });
}
