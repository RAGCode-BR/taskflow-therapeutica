import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  isOffline,
  listFailedOfflineOperations,
  listOfflineOperations,
  moveOfflineOperationToFailed,
  removeOfflineOperation,
  replaceOfflineOperation,
  type OfflineOperation,
} from "@/lib/offline-sync";
import {
  MAX_SYNC_ATTEMPTS,
  SyncBlocker,
  classifySyncError,
  retryDelayMs,
  syncErrorMessage,
} from "@/lib/offline-sync-policy";
import {
  createAuthenticatedSyncClient,
  syncOperation,
  type SyncClient,
} from "@/lib/offline-sync-operations";

/** Uma aba por vez envia a fila; as outras apenas enfileiram. */
async function withSyncLock(userId: string, callback: () => Promise<void>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(
      `taskflow-offline-sync:${userId}`,
      { ifAvailable: true },
      async (lock) => {
        if (lock) await callback();
      },
    );
    return;
  }
  await callback();
}

/** Envia alterações locais quando a conexão volta, sem bloquear a interface. */
export function OfflineSyncManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const syncing = useRef(false);
  const rerunRequested = useRef(false);
  const forceSessionRefresh = useRef(false);
  const warnedFailure = useRef(false);

  const sync = useCallback(async () => {
    if (!user || isOffline()) return;
    if (syncing.current) {
      // A fila mudou durante um envio: repita ao terminar em vez de esperar o intervalo.
      rerunRequested.current = true;
      return;
    }
    syncing.current = true;
    rerunRequested.current = false;
    let synced = 0;
    let conflicts = 0;
    let retrying = 0;
    let newlyFailed = 0;
    try {
      await withSyncLock(user.id, async () => {
        const operations = await listOfflineOperations(user.id);
        if (operations.length === 0) return;
        let client: SyncClient;
        try {
          client = await createAuthenticatedSyncClient(forceSessionRefresh.current);
          forceSessionRefresh.current = false;
        } catch (error) {
          // A conexão pode voltar alguns instantes antes de o servidor de sessão
          // estar acessível. Mantemos toda a fila e repetimos automaticamente.
          console.warn("[offline sync] aguardando uma sessão autenticada:", error);
          if (!warnedFailure.current) {
            warnedFailure.current = true;
            toast.warning("Os dados offline continuam salvos neste aparelho e a sincronização será repetida.");
          }
          return;
        }

        // Operações em revisão também seguram as que dependem delas.
        const blocker = new SyncBlocker();
        for (const failed of await listFailedOfflineOperations(user.id)) blocker.block(failed);

        for (const operation of operations) {
          if (isOffline()) break;
          const waitingRetry =
            operation.nextAttemptAt && Date.parse(operation.nextAttemptAt) > Date.now();
          if (waitingRetry || blocker.isBlocked(operation)) {
            // Preserva a ordem: nada posterior sobre o mesmo registro passa na frente.
            blocker.block(operation);
            continue;
          }
          try {
            const hasConflict = await syncOperation(client, operation);
            await removeOfflineOperation(user.id, operation.id);
            synced += 1;
            if (hasConflict) conflicts += 1;
          } catch (error) {
            const kind = classifySyncError(error);
            if (kind === "network" || kind === "auth") {
              // Não é culpa da operação: mantém tudo e tenta de novo depois.
              if (kind === "auth") forceSessionRefresh.current = true;
              console.warn("[offline sync] envio interrompido:", kind, error);
              break;
            }
            blocker.block(operation);
            const attempts = operation.attempts + 1;
            const lastError = syncErrorMessage(error);
            console.warn(
              "[offline sync] servidor recusou a operação:",
              operation.entity,
              operation.action,
              error,
            );
            if (attempts >= MAX_SYNC_ATTEMPTS) {
              await moveOfflineOperationToFailed({ ...operation, attempts }, lastError);
              newlyFailed += 1;
            } else {
              await replaceOfflineOperation({
                ...operation,
                attempts,
                lastError,
                nextAttemptAt: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
              });
              retrying += 1;
            }
          }
        }
      });

      if (newlyFailed > 0) {
        toast.error(
          newlyFailed === 1
            ? "Uma alteração feita offline foi recusada pelo servidor e precisa de revisão."
            : `${newlyFailed} alterações feitas offline foram recusadas pelo servidor e precisam de revisão.`,
          {
            action: {
              label: "Revisar",
              onClick: () => window.dispatchEvent(new Event("taskflow:offline-failed-open")),
            },
          },
        );
      } else if (retrying > 0 && !warnedFailure.current) {
        warnedFailure.current = true;
        toast.warning("Algumas alterações ainda não foram sincronizadas. Elas continuam salvas neste aparelho.");
      }
      if (synced > 0) {
        // A fila alcança várias telas (mural, notas, clientes…): atualize todas.
        await queryClient.invalidateQueries();
        toast.success(
          conflicts > 0
            ? "Dados sincronizados. Há alterações que precisam de revisão."
            : "Dados offline sincronizados.",
        );
        if (retrying === 0 && newlyFailed === 0) warnedFailure.current = false;
        if (conflicts > 0) window.dispatchEvent(new Event("taskflow:offline-conflicts"));
      }
    } finally {
      syncing.current = false;
      if (rerunRequested.current) window.setTimeout(() => void syncRef.current(), 0);
    }
  }, [queryClient, user]);

  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    const run = () => void sync();
    run();
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    window.addEventListener("taskflow:offline-queue-changed", run);
    // A opção Offline do DevTools pode voltar a rede sem disparar o evento
    // `online`. A checagem periódica garante que a fila não fique parada.
    const interval = window.setInterval(run, 5_000);
    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("taskflow:offline-queue-changed", run);
      window.clearInterval(interval);
    };
  }, [sync]);

  return null;
}
