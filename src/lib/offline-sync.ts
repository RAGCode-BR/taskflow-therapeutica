import { createStore, del, get, set } from "idb-keyval";
import { classifySyncError } from "@/lib/offline-sync-policy";

export type OfflineEntity =
  | "task"
  | "task_order"
  | "record"
  | "subtask"
  | "client"
  | "comment"
  | "attachment"
  | "tag"
  | "column"
  | "obligation"
  | "mural"
  | "reaction";

export type OfflineAction = "create" | "update" | "delete";

export type OfflineOperation = {
  id: string;
  userId: string;
  entity: OfflineEntity;
  action: OfflineAction;
  entityId: string;
  payload: Record<string, unknown>;
  /** Valores conhecidos dos campos alterados; permitem mesclar edições independentes. */
  baseValues?: Record<string, unknown>;
  /** Versão conhecida antes da edição; base para detectar conflito no servidor. */
  baseUpdatedAt?: string | null;
  createdAt: string;
  attempts: number;
  /** Última recusa do servidor, exibida quando a operação vai para revisão. */
  lastError?: string;
  /** Próxima tentativa permitida depois de uma recusa (espera exponencial). */
  nextAttemptAt?: string;
  /** Preenchido quando a operação esgotou as tentativas e aguarda revisão. */
  failedAt?: string;
};

export type OfflineConflict = {
  id: string;
  operationId: string;
  userId: string;
  entity: OfflineEntity;
  entityId: string;
  field: string;
  serverValue: unknown;
  localValue: unknown;
  serverUpdatedAt?: string | null;
  createdAt: string;
};

const store = createStore("taskflow-offline", "sync");
const operationsKey = (userId: string) => `operations:${userId}`;
const conflictsKey = (userId: string) => `conflicts:${userId}`;
const failedKey = (userId: string) => `failed:${userId}`;
const localWriteLocks = new Map<string, Promise<void>>();

function makeId() {
  return crypto.randomUUID();
}

async function withLocalWriteLock<T>(userId: string, callback: () => Promise<T>): Promise<T> {
  const previous = localWriteLocks.get(userId) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  localWriteLocks.set(userId, tail);

  await previous;
  try {
    return await callback();
  } finally {
    release();
    if (localWriteLocks.get(userId) === tail) localWriteLocks.delete(userId);
  }
}

// Fila, conflitos e falhas compartilham uma única trava por usuário (entre
// abas, via Web Locks). A trava não é reentrante: nunca aninhe estas chamadas.
async function withOfflineWriteLock<T>(userId: string, callback: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(`taskflow-offline-queue:${userId}`, callback);
  }
  return withLocalWriteLock(userId, callback);
}

async function mutateStoredList<T>(
  userId: string,
  key: string,
  mutate: (current: T[]) => T[],
) {
  return withOfflineWriteLock(userId, async () => {
    const current = (await get<T[]>(key, store)) ?? [];
    const next = mutate(current);
    await set(key, next, store);
    return next;
  });
}

function mutateOfflineOperations(
  userId: string,
  mutate: (current: OfflineOperation[]) => OfflineOperation[],
) {
  return mutateStoredList(userId, operationsKey(userId), mutate);
}

function mutateOfflineConflicts(
  userId: string,
  mutate: (current: OfflineConflict[]) => OfflineConflict[],
) {
  return mutateStoredList(userId, conflictsKey(userId), mutate);
}

function notifyQueueChanged(userId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("taskflow:offline-queue-changed", { detail: { userId } }));
}

function notifyFailedChanged(userId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("taskflow:offline-failed", { detail: { userId } }));
}

const byCreatedAt = (first: OfflineOperation, second: OfflineOperation) =>
  first.createdAt.localeCompare(second.createdAt);

export async function listOfflineOperations(userId: string) {
  return (await get<OfflineOperation[]>(operationsKey(userId), store)) ?? [];
}

export async function enqueueOfflineOperation(
  input: Omit<OfflineOperation, "id" | "createdAt" | "attempts">,
) {
  const operation: OfflineOperation = {
    ...input,
    id: makeId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await mutateOfflineOperations(operation.userId, (current) => [...current, operation]);
  notifyQueueChanged(operation.userId);
  return operation;
}

export async function replaceOfflineOperation(operation: OfflineOperation) {
  await mutateOfflineOperations(
    operation.userId,
    (current) => current.map((item) => (item.id === operation.id ? operation : item)),
  );
}

export async function removeOfflineOperation(userId: string, operationId: string) {
  await mutateOfflineOperations(
    userId,
    (current) => current.filter((item) => item.id !== operationId),
  );
}

export async function listOfflineConflicts(userId: string) {
  return (await get<OfflineConflict[]>(conflictsKey(userId), store)) ?? [];
}

export async function addOfflineConflicts(
  userId: string,
  conflicts: Omit<OfflineConflict, "id" | "createdAt" | "userId">[],
) {
  if (conflicts.length === 0) return [];
  const createdAt = new Date().toISOString();
  const items: OfflineConflict[] = conflicts.map((conflict) => ({
    ...conflict,
    userId,
    id: makeId(),
    createdAt,
  }));
  await mutateOfflineConflicts(userId, (current) => [...current, ...items]);
  return items;
}

export async function addOfflineConflict(conflict: Omit<OfflineConflict, "id" | "createdAt">) {
  const { userId, ...rest } = conflict;
  const [item] = await addOfflineConflicts(userId, [rest]);
  return item;
}

export async function replaceOfflineConflict(conflict: OfflineConflict) {
  await mutateOfflineConflicts(conflict.userId, (current) =>
    current.map((item) => (item.id === conflict.id ? conflict : item)),
  );
}

export async function removeOfflineConflict(userId: string, conflictId: string) {
  await mutateOfflineConflicts(userId, (current) =>
    current.filter((item) => item.id !== conflictId),
  );
}

export async function listFailedOfflineOperations(userId: string) {
  return (await get<OfflineOperation[]>(failedKey(userId), store)) ?? [];
}

/** Tira a operação da fila e a guarda para revisão, numa única escrita travada. */
export async function moveOfflineOperationToFailed(operation: OfflineOperation, lastError: string) {
  await withOfflineWriteLock(operation.userId, async () => {
    const queued = (await get<OfflineOperation[]>(operationsKey(operation.userId), store)) ?? [];
    const failed = (await get<OfflineOperation[]>(failedKey(operation.userId), store)) ?? [];
    const failedOperation: OfflineOperation = {
      ...operation,
      lastError,
      failedAt: new Date().toISOString(),
      nextAttemptAt: undefined,
    };
    await set(
      failedKey(operation.userId),
      [...failed.filter((item) => item.id !== operation.id), failedOperation],
      store,
    );
    await set(
      operationsKey(operation.userId),
      queued.filter((item) => item.id !== operation.id),
      store,
    );
  });
  notifyFailedChanged(operation.userId);
}

/** Devolve a operação à fila na posição original para preservar a ordem. */
export async function retryFailedOfflineOperation(userId: string, operationId: string) {
  await withOfflineWriteLock(userId, async () => {
    const queued = (await get<OfflineOperation[]>(operationsKey(userId), store)) ?? [];
    const failed = (await get<OfflineOperation[]>(failedKey(userId), store)) ?? [];
    const operation = failed.find((item) => item.id === operationId);
    if (!operation) return;
    const restored: OfflineOperation = {
      ...operation,
      attempts: 0,
      failedAt: undefined,
      nextAttemptAt: undefined,
    };
    await set(
      operationsKey(userId),
      [...queued.filter((item) => item.id !== operationId), restored].sort(byCreatedAt),
      store,
    );
    await set(
      failedKey(userId),
      failed.filter((item) => item.id !== operationId),
      store,
    );
  });
  notifyFailedChanged(userId);
  notifyQueueChanged(userId);
}

export async function discardFailedOfflineOperation(userId: string, operationId: string) {
  await mutateStoredList<OfflineOperation>(userId, failedKey(userId), (current) =>
    current.filter((item) => item.id !== operationId),
  );
  notifyFailedChanged(userId);
  // Operações que aguardavam esta podem seguir agora.
  notifyQueueChanged(userId);
}

/** Remove somente os dados locais da pessoa que saiu da conta. */
export async function clearOfflineSyncData(userId: string) {
  await Promise.all([
    del(operationsKey(userId), store),
    del(conflictsKey(userId), store),
    del(failedKey(userId), store),
  ]);
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * `navigator.onLine` indica apenas se o navegador enxerga uma interface de rede.
 * Wi-Fi sem internet, DevTools Offline e a transição de reconexão podem produzir
 * uma falha real de `fetch` enquanto esse sinal ainda está `true`.
 */
export function isNetworkFailure(error: unknown) {
  return classifySyncError(error) === "network";
}
