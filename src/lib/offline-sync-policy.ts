import type { OfflineOperation } from "@/lib/offline-sync";

/** Tentativas com erro do servidor antes de a operação ir para revisão manual. */
export const MAX_SYNC_ATTEMPTS = 8;

const BASE_RETRY_DELAY = 5_000;
const MAX_RETRY_DELAY = 5 * 60_000;

/** Espera exponencial: 5 s, 10 s, 20 s… limitada a 5 minutos. */
export function retryDelayMs(attempts: number) {
  return Math.min(BASE_RETRY_DELAY * 2 ** Math.max(attempts - 1, 0), MAX_RETRY_DELAY);
}

export type SyncErrorKind = "network" | "auth" | "server";

export function syncErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "Erro desconhecido");
}

/**
 * Falhas de rede e de sessão não contam como tentativa: a operação continua
 * válida e só precisa de conexão ou de um token renovado. Qualquer outro erro
 * vem do servidor e conta para o limite de tentativas.
 */
export function classifySyncError(error: unknown): SyncErrorKind {
  const message = syncErrorMessage(error);
  if (
    /failed to fetch|fetch failed|networkerror|network request failed|load failed|err_internet_disconnected|connection.*(closed|reset)|offline/i.test(
      message,
    )
  ) {
    return "network";
  }
  const details = (typeof error === "object" && error ? error : {}) as {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const code = String(details.code ?? "");
  const status = Number(details.status ?? details.statusCode ?? 0);
  if (code === "PGRST301" || code === "PGRST302" || code === "PGRST303" || status === 401) {
    return "auth";
  }
  if (/jwt expired|invalid jwt|jwt.*(malformed|invalid)/i.test(message)) return "auth";
  return "server";
}

// Colunas que apontam para outro registro que pode ter sido criado offline.
// Colunas de pessoas (user_id, author_id, created_by…) ficam de fora: elas não
// dependem da fila e bloqueariam operações sem relação entre si.
const DEPENDENCY_FIELDS = new Set([
  "task_id",
  "subtask_id",
  "comment_id",
  "reply_to_id",
  "client_id",
  "department_id",
  "employee_id",
  "branch_id",
  "note_id",
  "request_id",
  "post_id",
  "obligation_id",
  "obligation_occurrence_id",
  "column_id",
  "status_id",
  "tag_id",
  "parent_id",
]);

const PAYLOAD_RECORD_KEYS = ["task", "subtask", "comment", "record", "attachment", "reaction"];

function payloadRecords(operation: OfflineOperation): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const key of [...PAYLOAD_RECORD_KEYS, "patch"]) {
    const value = operation.payload[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      records.push(value as Record<string, unknown>);
    }
  }
  const rows = operation.payload.rows;
  if (Array.isArray(rows)) {
    for (const row of rows)
      if (row && typeof row === "object") records.push(row as Record<string, unknown>);
  }
  return records;
}

/** Identificadores do registro que a própria operação cria ou altera. */
export function operationOwnKeys(operation: OfflineOperation) {
  const keys = new Set([operation.entityId]);
  for (const key of PAYLOAD_RECORD_KEYS) {
    const value = operation.payload[key] as Record<string, unknown> | undefined;
    if (value && typeof value.id === "string") keys.add(value.id);
  }
  return keys;
}

/** Registro próprio mais os registros pais que precisam existir antes. */
export function operationDependencyKeys(operation: OfflineOperation) {
  const keys = operationOwnKeys(operation);
  for (const record of payloadRecords(operation)) {
    for (const [field, value] of Object.entries(record)) {
      if (DEPENDENCY_FIELDS.has(field) && typeof value === "string" && value) keys.add(value);
    }
  }
  return keys;
}

/**
 * Mantém a ordem por registro: depois que uma operação fica pendente, as
 * seguintes sobre o mesmo registro, ou que dependem dele, também esperam.
 * Operações independentes continuam sendo enviadas.
 */
export class SyncBlocker {
  private readonly blocked = new Set<string>();

  block(operation: OfflineOperation) {
    for (const key of operationOwnKeys(operation)) this.blocked.add(key);
  }

  isBlocked(operation: OfflineOperation) {
    for (const key of operationDependencyKeys(operation)) if (this.blocked.has(key)) return true;
    return false;
  }
}

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** Compara valores vindos do servidor e do aparelho, tolerando formatos de data diferentes. */
export function sameSyncValue(first: unknown, second: unknown) {
  if (
    typeof first === "string" &&
    typeof second === "string" &&
    TIMESTAMP_PATTERN.test(first) &&
    TIMESTAMP_PATTERN.test(second)
  ) {
    const firstTime = Date.parse(first);
    const secondTime = Date.parse(second);
    if (!Number.isNaN(firstTime) && !Number.isNaN(secondTime)) return firstTime === secondTime;
  }
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null);
}
