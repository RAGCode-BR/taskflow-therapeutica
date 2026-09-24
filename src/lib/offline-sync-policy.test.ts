import { describe, expect, it } from "vitest";
import type { OfflineOperation } from "./offline-sync";
import {
  SyncBlocker,
  classifySyncError,
  operationDependencyKeys,
  retryDelayMs,
  sameSyncValue,
} from "./offline-sync-policy";

function operation(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    entity: "task",
    action: "update",
    entityId: "task-1",
    payload: {},
    createdAt: new Date().toISOString(),
    attempts: 0,
    ...overrides,
  };
}

describe("sync error classification", () => {
  it("keeps network and session failures out of the attempt count", () => {
    expect(classifySyncError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifySyncError({ code: "PGRST301", message: "JWT expired" })).toBe("auth");
    expect(classifySyncError({ message: "jwt expired" })).toBe("auth");
  });

  it("counts database refusals", () => {
    expect(
      classifySyncError({ code: "42501", message: "new row violates row-level security policy" }),
    ).toBe("server");
  });
});

describe("retry delay", () => {
  it("grows exponentially up to five minutes", () => {
    expect(retryDelayMs(1)).toBe(5_000);
    expect(retryDelayMs(2)).toBe(10_000);
    expect(retryDelayMs(4)).toBe(40_000);
    expect(retryDelayMs(20)).toBe(5 * 60_000);
  });
});

describe("sync ordering", () => {
  it("holds later operations on the same record", () => {
    const blocker = new SyncBlocker();
    blocker.block(operation({ entityId: "task-1" }));
    expect(blocker.isBlocked(operation({ entityId: "task-1" }))).toBe(true);
    expect(blocker.isBlocked(operation({ entityId: "task-2" }))).toBe(false);
  });

  it("holds children of a record that was not created yet", () => {
    const blocker = new SyncBlocker();
    blocker.block(
      operation({ action: "create", entityId: "task-1", payload: { task: { id: "task-1" } } }),
    );
    const subtask = operation({
      entity: "subtask",
      action: "create",
      entityId: "subtask-1",
      payload: { subtask: { id: "subtask-1", task_id: "task-1" } },
    });
    const order = operation({
      entity: "task_order",
      entityId: "order",
      payload: { rows: [{ task_id: "task-1", user_id: "user-1" }] },
    });
    expect(blocker.isBlocked(subtask)).toBe(true);
    expect(blocker.isBlocked(order)).toBe(true);
  });

  it("does not treat people as dependencies", () => {
    const blocker = new SyncBlocker();
    blocker.block(
      operation({
        entity: "record",
        action: "create",
        entityId: "user-1",
        payload: { table: "board_preferences" },
      }),
    );
    const comment = operation({
      entity: "comment",
      action: "create",
      entityId: "comment-1",
      payload: { comment: { id: "comment-1", task_id: "task-9", author_id: "user-1" } },
    });
    expect(operationDependencyKeys(comment).has("user-1")).toBe(false);
    expect(blocker.isBlocked(comment)).toBe(false);
  });
});

describe("value comparison", () => {
  it("treats equivalent timestamps as equal", () => {
    expect(sameSyncValue("2026-09-24T12:00:00.000Z", "2026-09-24T12:00:00+00:00")).toBe(true);
    expect(sameSyncValue("2026-09-24T12:00:00Z", "2026-09-24T12:00:01Z")).toBe(false);
  });

  it("treats missing and null as equal", () => {
    expect(sameSyncValue(undefined, null)).toBe(true);
    expect(sameSyncValue("a", "b")).toBe(false);
  });
});
