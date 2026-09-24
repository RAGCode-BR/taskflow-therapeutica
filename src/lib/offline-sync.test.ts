import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  createStore: () => ({}),
  get: async (key: string) => memory.get(key),
  set: async (key: string, value: unknown) => {
    // Yield once to reproduce the read/modify/write race that used to discard
    // operations when several offline changes were queued together.
    await Promise.resolve();
    memory.set(key, value);
  },
  del: async (key: string) => memory.delete(key),
}));

import {
  addOfflineConflicts,
  clearOfflineSyncData,
  discardFailedOfflineOperation,
  enqueueOfflineOperation,
  isNetworkFailure,
  listFailedOfflineOperations,
  listOfflineConflicts,
  listOfflineOperations,
  moveOfflineOperationToFailed,
  removeOfflineConflict,
  removeOfflineOperation,
  replaceOfflineOperation,
  retryFailedOfflineOperation,
} from "./offline-sync";

describe("offline operation queue", () => {
  beforeEach(() => memory.clear());

  it("does not lose concurrent writes", async () => {
    const userId = "user-1";
    await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        enqueueOfflineOperation({
          userId,
          entity: "task",
          action: "create",
          entityId: `task-${index}`,
          payload: { task: { id: `task-${index}`, title: `Task ${index}` } },
        }),
      ),
    );

    const queued = await listOfflineOperations(userId);
    expect(queued).toHaveLength(25);
    expect(new Set(queued.map((operation) => operation.entityId)).size).toBe(25);
  });

  it("preserves new operations while an existing one is updated and removed", async () => {
    const userId = "user-2";
    const first = await enqueueOfflineOperation({
      userId,
      entity: "task",
      action: "create",
      entityId: "first",
      payload: { task: { id: "first", title: "First" } },
    });

    await Promise.all([
      replaceOfflineOperation({ ...first, attempts: 1 }),
      enqueueOfflineOperation({
        userId,
        entity: "task",
        action: "create",
        entityId: "second",
        payload: { task: { id: "second", title: "Second" } },
      }),
    ]);
    await removeOfflineOperation(userId, first.id);

    const queued = await listOfflineOperations(userId);
    expect(queued.map((operation) => operation.entityId)).toEqual(["second"]);
    await clearOfflineSyncData(userId);
    expect(await listOfflineOperations(userId)).toEqual([]);
  });
});

describe("offline conflicts", () => {
  beforeEach(() => memory.clear());

  it("keeps every conflict recorded at the same time", async () => {
    const userId = "user-3";
    const conflict = (field: string) => ({
      operationId: "op",
      entity: "task" as const,
      entityId: "task-1",
      field,
      serverValue: "server",
      localValue: "local",
    });
    await Promise.all([
      addOfflineConflicts(userId, [conflict("title"), conflict("priority")]),
      addOfflineConflicts(userId, [conflict("due_date")]),
    ]);
    const stored = await listOfflineConflicts(userId);
    expect(stored.map((item) => item.field).sort()).toEqual(["due_date", "priority", "title"]);

    await Promise.all(stored.slice(0, 2).map((item) => removeOfflineConflict(userId, item.id)));
    expect(await listOfflineConflicts(userId)).toHaveLength(1);
  });
});

describe("failed offline operations", () => {
  beforeEach(() => memory.clear());

  it("moves an operation out of the queue and restores it in its original position", async () => {
    const userId = "user-4";
    const first = await enqueueOfflineOperation({
      userId,
      entity: "task",
      action: "create",
      entityId: "first",
      payload: { task: { id: "first" } },
    });
    await new Promise((resolve) => setTimeout(resolve, 2));
    await enqueueOfflineOperation({
      userId,
      entity: "task",
      action: "update",
      entityId: "first",
      payload: { patch: { title: "Updated" } },
    });

    await moveOfflineOperationToFailed({ ...first, attempts: 8 }, "denied");
    expect((await listOfflineOperations(userId)).map((item) => item.action)).toEqual(["update"]);
    const [failed] = await listFailedOfflineOperations(userId);
    expect(failed.lastError).toBe("denied");
    expect(failed.failedAt).toBeTruthy();

    await retryFailedOfflineOperation(userId, first.id);
    const queued = await listOfflineOperations(userId);
    expect(queued.map((item) => item.action)).toEqual(["create", "update"]);
    expect(queued[0].attempts).toBe(0);
    expect(await listFailedOfflineOperations(userId)).toEqual([]);
  });

  it("discards a failed operation on request", async () => {
    const userId = "user-5";
    const operation = await enqueueOfflineOperation({
      userId,
      entity: "record",
      action: "create",
      entityId: "note-1",
      payload: { table: "client_notes", record: { id: "note-1" } },
    });
    await moveOfflineOperationToFailed(operation, "denied");
    await discardFailedOfflineOperation(userId, operation.id);
    expect(await listFailedOfflineOperations(userId)).toEqual([]);
    expect(await listOfflineOperations(userId)).toEqual([]);
  });
});

describe("network failure detection", () => {
  it.each([
    new TypeError("Failed to fetch"),
    new Error("NetworkError when attempting to fetch resource"),
    { message: "net::ERR_INTERNET_DISCONNECTED" },
    "Load failed",
  ])("recognizes a transport failure", (error) => {
    expect(isNetworkFailure(error)).toBe(true);
  });

  it("does not treat a database validation error as offline", () => {
    expect(isNetworkFailure({ message: "new row violates row-level security policy" })).toBe(false);
  });
});
