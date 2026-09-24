import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { taskCreatePayloadForSync } from "@/lib/offline-task-payload";
import { addOfflineConflict, addOfflineConflicts, type OfflineOperation } from "@/lib/offline-sync";
import { sameSyncValue } from "@/lib/offline-sync-policy";

export type SyncClient = ReturnType<typeof createClient<Database>>;
const isAlreadyStored = (error: { message?: string } | null) =>
  !!error && /duplicate|already exists|resource already exists/i.test(error.message ?? "");

/** Rodadas de leitura e gravação condicional antes de adiar a operação. */
const MAX_CONDITIONAL_WRITE_ROUNDS = 3;

/**
 * Grava a edição somente se a tarefa ainda estiver na versão lida pelo
 * servidor (`updated_at`). Quando outra pessoa alterou a tarefa nesse meio
 * tempo, os campos que ela mudou viram conflito para revisão e os demais são
 * gravados. Assim nenhuma alteração é sobrescrita silenciosamente.
 */
export async function syncTaskUpdate(client: SyncClient, operation: OfflineOperation) {
  const patch = (operation.payload.patch ?? {}) as Record<string, unknown>;
  if (Object.keys(patch).length === 0) return false;

  if (!operation.baseUpdatedAt) {
    const { error } = await (client.from("tasks") as any)
      .update(patch)
      .eq("id", operation.entityId);
    if (error) throw error;
    return false;
  }

  const baseValues = operation.baseValues ?? {};
  let expectedUpdatedAt = operation.baseUpdatedAt;
  let pending = { ...patch };
  const conflicts = new Map<string, { serverValue: unknown; serverUpdatedAt: string | null }>();

  for (let round = 0; round < MAX_CONDITIONAL_WRITE_ROUNDS; round += 1) {
    const { data: written, error: writeError } = await (client.from("tasks") as any)
      .update(pending)
      .eq("id", operation.entityId)
      .eq("updated_at", expectedUpdatedAt)
      .select("id");
    if (writeError) throw writeError;

    if (Array.isArray(written) && written.length > 0) {
      await storeTaskFieldConflicts(operation, conflicts);
      return conflicts.size > 0;
    }

    const { data, error: readError } = await client
      .from("tasks")
      .select("*")
      .eq("id", operation.entityId)
      .maybeSingle();
    if (readError) throw readError;
    if (!data) throw new Error("A tarefa não está disponível no servidor para esta conta.");
    const server = data as Record<string, unknown>;
    const serverUpdatedAt = (server.updated_at as string | null | undefined) ?? null;

    if (serverUpdatedAt && sameSyncValue(serverUpdatedAt, expectedUpdatedAt)) {
      // A versão confere e mesmo assim nenhuma linha foi alterada: o RLS recusou.
      throw new Error("Sem permissão para alterar esta tarefa.");
    }

    const next: Record<string, unknown> = {};
    for (const [field, localValue] of Object.entries(pending)) {
      // O servidor já tem o mesmo valor: nada a gravar nem a revisar.
      if (sameSyncValue(server[field], localValue)) continue;
      if (!sameSyncValue(server[field], baseValues[field])) {
        conflicts.set(field, { serverValue: server[field], serverUpdatedAt });
        continue;
      }
      next[field] = localValue;
    }

    if (Object.keys(next).length === 0) {
      await storeTaskFieldConflicts(operation, conflicts);
      return conflicts.size > 0;
    }
    pending = next;
    expectedUpdatedAt = serverUpdatedAt ?? expectedUpdatedAt;
  }

  // A tarefa mudou a cada rodada. Os conflitos serão recalculados na próxima tentativa.
  throw new Error("A tarefa está sendo alterada ao mesmo tempo em outro aparelho.");
}

async function storeTaskFieldConflicts(
  operation: OfflineOperation,
  conflicts: Map<string, { serverValue: unknown; serverUpdatedAt: string | null }>,
) {
  const patch = (operation.payload.patch ?? {}) as Record<string, unknown>;
  await addOfflineConflicts(
    operation.userId,
    Array.from(conflicts, ([field, { serverValue, serverUpdatedAt }]) => ({
      operationId: operation.id,
      entity: operation.entity,
      entityId: operation.entityId,
      field,
      serverValue,
      localValue: patch[field],
      serverUpdatedAt,
    })),
  );
}

async function syncTaskDelete(client: SyncClient, operation: OfflineOperation) {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("id", operation.entityId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  const server = data as Record<string, unknown>;
  if (operation.baseUpdatedAt && server.updated_at !== operation.baseUpdatedAt) {
    await addOfflineConflict({
      operationId: operation.id,
      userId: operation.userId,
      entity: "task",
      entityId: operation.entityId,
      field: "__deleted",
      serverValue: server,
      localValue: operation.payload.task,
      serverUpdatedAt: (server.updated_at as string | null | undefined) ?? null,
    });
    return true;
  }
  const { error: deleteError } = await client.from("tasks").delete().eq("id", operation.entityId);
  if (deleteError) throw deleteError;
  return false;
}

export async function syncOperation(client: SyncClient, operation: OfflineOperation) {
  if (operation.entity === "task") {
    if (operation.action === "create") {
      const taskPayload = taskCreatePayloadForSync(
        operation.payload.task as Record<string, unknown>,
      );
      const { error } = await (client.from("tasks") as any).upsert(taskPayload, {
        onConflict: "id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
      return false;
    }
    if (operation.action === "update") return syncTaskUpdate(client, operation);
    return syncTaskDelete(client, operation);
  }

  if (operation.entity === "subtask") {
    if (operation.action === "create") {
      const { error } = await (client.from("subtasks") as any).upsert(operation.payload.subtask, {
        onConflict: "id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
      return false;
    }
    if (operation.action === "update") {
      const { error } = await (client.from("subtasks") as any)
        .update(operation.payload.patch)
        .eq("id", operation.entityId);
      if (error) throw error;
      return false;
    }
    const { error } = await client.from("subtasks").delete().eq("id", operation.entityId);
    if (error) throw error;
    return false;
  }

  if (operation.entity === "comment") {
    if (operation.action === "create") {
      const comment = operation.payload.comment as Record<string, unknown>;
      const { error: commentError } = await (client.from("comments") as any).upsert(comment, {
        onConflict: "id",
        ignoreDuplicates: true,
      });
      if (commentError) throw commentError;
      const audio = operation.payload.audio as
        { blob: Blob; extension: string; contentType: string; fileName: string } | undefined;
      if (audio) {
        const path = `${String(comment.task_id)}/comments/${String(comment.id)}/${String(comment.id)}-audio.${audio.extension}`;
        const { error: uploadError } = await client.storage
          .from("task-attachments")
          .upload(path, audio.blob, { contentType: audio.contentType, upsert: false });
        if (uploadError && !isAlreadyStored(uploadError)) throw uploadError;
        const { error: attachmentError } = await (client.from("comment_attachments") as any).upsert(
          {
            id: comment.id,
            comment_id: comment.id,
            task_id: comment.task_id,
            file_name: audio.fileName,
            storage_path: path,
            mime_type: audio.contentType,
            size_bytes: audio.blob.size,
            uploaded_by: comment.author_id,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (attachmentError) throw attachmentError;
      }
      return false;
    }
    if (operation.action === "update") {
      const { error } = await (client.from("comments") as any)
        .update(operation.payload.patch)
        .eq("id", operation.entityId);
      if (error) throw error;
      return false;
    }
    const { error } = await client.from("comments").delete().eq("id", operation.entityId);
    if (error) throw error;
    return false;
  }

  if (operation.entity === "task_order") {
    const { error } = await client
      .from("user_task_order")
      .upsert(operation.payload.rows as any[], { onConflict: "user_id,task_id" });
    if (error) throw error;
    return false;
  }

  if (operation.entity === "record") {
    const table = operation.payload.table;
    if (typeof table !== "string") throw new Error("Registro offline inválido.");
    if (operation.action === "create") {
      const record = operation.payload.record as Record<string, unknown>;
      const compositeConflict =
        table === "service_request_participants" ? "request_id,user_id" : undefined;
      const canRetrySafely = Boolean(
        operation.payload.upsert || "id" in record || compositeConflict,
      );
      const request = canRetrySafely
        ? (client.from(table as any) as any).upsert(record, {
            onConflict: String(operation.payload.onConflict || compositeConflict || "id"),
            ignoreDuplicates: !operation.payload.upsert,
          })
        : (client.from(table as any) as any).insert(record);
      const { error } = await request;
      if (error) throw error;
      return false;
    }
    if (operation.action === "update") {
      const { error } = await (client.from(table as any) as any)
        .update(operation.payload.patch)
        .eq("id", operation.entityId);
      if (error) throw error;
      return false;
    }
    const { error } = await (client.from(table as any) as any)
      .delete()
      .eq("id", operation.entityId);
    if (error) throw error;
    return false;
  }

  if (operation.entity === "reaction") {
    const reaction = operation.payload.reaction as Record<string, unknown>;
    if (operation.action === "delete") {
      const { error } = await ((client as any).from("mural_post_reactions") as any)
        .delete()
        .match({ post_id: reaction.post_id, user_id: reaction.user_id, emoji: reaction.emoji });
      if (error) throw error;
      return false;
    }
    const { error } = await ((client as any).from("mural_post_reactions") as any).insert(reaction);
    if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
    return false;
  }

  if (operation.entity === "attachment") {
    const attachment = operation.payload.attachment as Record<string, unknown>;
    const bucket = String(operation.payload.bucket);
    const blob = operation.payload.blob as Blob;
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(String(attachment.storage_path), blob, {
        contentType: String(attachment.mime_type || "application/octet-stream"),
        upsert: false,
      });
    if (uploadError && !isAlreadyStored(uploadError)) throw uploadError;
    if (operation.payload.table === "client_avatar_updates") {
      const { error } = await (client.from("clients") as any)
        .update({ avatar_path: attachment.storage_path })
        .eq("id", attachment.client_id);
      if (error) throw error;
      return false;
    }
    const { error: insertError } = await (
      client.from(String(operation.payload.table) as any) as any
    ).upsert(attachment, { onConflict: "id", ignoreDuplicates: true });
    if (insertError) throw insertError;
    return false;
  }

  throw new Error("Tipo de alteração offline ainda não suportado.");
}

export async function createAuthenticatedSyncClient(forceRefresh = false): Promise<SyncClient> {
  // Use primeiro a sessao persistida. Forcar refresh em toda reconexao rotaciona
  // o token sem necessidade e pode oscilar a autenticacao antes de processar a fila.
  const {
    data: { session: storedSession },
  } = await supabase.auth.getSession();
  let session = storedSession;
  const expiresSoon = !session?.expires_at || session.expires_at * 1000 <= Date.now() + 30_000;

  if (expiresSoon || forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw (
        error ?? new Error("Não foi possível renovar a sessão para sincronizar os dados offline.")
      );
    }
    session = data.session;
  }

  if (!session?.access_token) {
    throw new Error("Não foi possível localizar uma sessão para sincronizar os dados offline.");
  }

  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("A conexão com o servidor não está configurada.");
  }

  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}
