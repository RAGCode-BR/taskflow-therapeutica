import { beforeEach, describe, expect, it, vi } from "vitest";

const conflicts = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/offline-sync", () => ({
  addOfflineConflict: async (conflict: Record<string, unknown>) => conflicts.push(conflict),
  addOfflineConflicts: async (_userId: string, items: Record<string, unknown>[]) =>
    conflicts.push(...items),
}));

import type { OfflineOperation } from "./offline-sync";
import { syncTaskUpdate, type SyncClient } from "./offline-sync-operations";

type Row = Record<string, unknown>;

/** Imita o PostgREST para `tasks`, incluindo o trigger que renova `updated_at`. */
function fakeTasks(
  row: Row,
  options: { denyWrites?: boolean; beforeWrite?: (row: Row) => void } = {},
) {
  let version = 1;
  const touch = () => {
    version += 1;
    row.updated_at = `2026-09-24T12:00:0${version}.000000+00:00`;
  };
  const client = {
    from: () => {
      const filters: Row = {};
      let patch: Row | null = null;
      const builder: any = {
        update(values: Row) {
          patch = values;
          return builder;
        },
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: { ...row }, error: null });
        },
        then(resolve: (value: unknown) => void) {
          if (!patch) return resolve({ data: [{ ...row }], error: null });
          options.beforeWrite?.(row);
          const matches = Object.entries(filters).every(([column, value]) => row[column] === value);
          if (!matches || options.denyWrites) return resolve({ data: [], error: null });
          Object.assign(row, patch);
          touch();
          resolve({ data: [{ id: row.id }], error: null });
        },
      };
      return builder;
    },
  };
  return client as unknown as SyncClient;
}

function update(patch: Row, baseValues: Row, baseUpdatedAt: string): OfflineOperation {
  return {
    id: "op-1",
    userId: "user-1",
    entity: "task",
    action: "update",
    entityId: "task-1",
    payload: { patch },
    baseValues,
    baseUpdatedAt,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
}

const BASE = "2026-09-24T12:00:01.000000+00:00";

describe("offline task update", () => {
  beforeEach(() => {
    conflicts.length = 0;
  });

  it("writes directly when nobody changed the task", async () => {
    const row = { id: "task-1", title: "Old", priority: "low", updated_at: BASE };
    const hasConflict = await syncTaskUpdate(
      fakeTasks(row),
      update({ title: "New" }, { title: "Old" }, BASE),
    );
    expect(hasConflict).toBe(false);
    expect(row.title).toBe("New");
    expect(conflicts).toEqual([]);
  });

  it("merges independent fields and records every conflicting one", async () => {
    // Outro aparelho mudou título e prioridade; este mudou título, prioridade e prazo.
    const row = {
      id: "task-1",
      title: "Server title",
      priority: "high",
      due_date: null,
      updated_at: "2026-09-24T12:00:05.000000+00:00",
    };
    const hasConflict = await syncTaskUpdate(
      fakeTasks(row),
      update(
        { title: "Local title", priority: "medium", due_date: "2026-10-01" },
        { title: "Old", priority: "low", due_date: null },
        BASE,
      ),
    );
    expect(hasConflict).toBe(true);
    expect(row).toMatchObject({ title: "Server title", priority: "high", due_date: "2026-10-01" });
    expect(conflicts.map((item) => item.field).sort()).toEqual(["priority", "title"]);
  });

  it("does not flag a conflict when both devices made the same change", async () => {
    const row = { id: "task-1", title: "Same", updated_at: "2026-09-24T12:00:05.000000+00:00" };
    const hasConflict = await syncTaskUpdate(
      fakeTasks(row),
      update({ title: "Same" }, { title: "Old" }, BASE),
    );
    expect(hasConflict).toBe(false);
    expect(conflicts).toEqual([]);
  });

  it("detects a change that lands between reading and writing", async () => {
    const row: Row = { id: "task-1", title: "Old", status: "todo", updated_at: BASE };
    let raced = false;
    const client = fakeTasks(row, {
      beforeWrite: (current) => {
        if (raced) return;
        raced = true;
        current.title = "Changed elsewhere";
        current.updated_at = "2026-09-24T12:00:09.000000+00:00";
      },
    });
    const hasConflict = await syncTaskUpdate(
      client,
      update({ title: "Local", status: "done" }, { title: "Old", status: "todo" }, BASE),
    );
    expect(hasConflict).toBe(true);
    expect(row).toMatchObject({ title: "Changed elsewhere", status: "done" });
    expect(conflicts.map((item) => item.field)).toEqual(["title"]);
  });

  it("reports a refusal by row-level security instead of reporting success", async () => {
    const row = { id: "task-1", title: "Old", updated_at: BASE };
    await expect(
      syncTaskUpdate(
        fakeTasks(row, { denyWrites: true }),
        update({ title: "New" }, { title: "Old" }, BASE),
      ),
    ).rejects.toThrow("Sem permissão");
    expect(row.title).toBe("Old");
  });
});
