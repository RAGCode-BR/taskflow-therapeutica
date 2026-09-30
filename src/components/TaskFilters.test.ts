import { describe, expect, it } from "vitest";
import { applyTaskFilters } from "./TaskFilters";

const task = (id: string, assignee_id: string | null) => ({
  id,
  assignee_id,
  priority: "medium",
  column_id: null,
  status_id: null,
  created_by: "andrea",
  due_date: null,
  status: "todo",
  completed_at: null,
});

describe("applyTaskFilters — filtro por pessoa", () => {
  const tasks = [task("t1", "andrea"), task("t2", "haila"), task("t3", "andrea")];

  it("inclui as tarefas em que a pessoa escolhida é colaboradora", () => {
    const result = applyTaskFilters(
      tasks,
      { assignee: "haila" },
      {
        userId: "admin",
        collaboratorTaskIdsByUser: new Map([["haila", new Set(["t1"])]]),
      },
    );
    expect(result.map((item) => item.id)).toEqual(["t1", "t2"]);
  });

  it("mostra à colaboradora as tarefas em que ela colabora", () => {
    const result = applyTaskFilters(
      tasks,
      {},
      {
        userId: "haila",
        collaboratorTaskIds: new Set(["t3"]),
        restrictToCurrentUserParticipation: true,
      },
    );
    expect(result.map((item) => item.id)).toEqual(["t2", "t3"]);
  });
});
