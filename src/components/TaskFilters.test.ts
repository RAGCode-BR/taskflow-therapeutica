import { describe, expect, it } from "vitest";
import { applyTaskFilters } from "./TaskFilters";

const task = (id: string, assignee_id: string | null) => ({
  id,
  title: id,
  assignee_id,
  priority: "medium",
  column_id: null,
  status_id: null,
  created_by: "andrea",
  due_date: null,
  status: "todo",
  completed_at: null,
});

describe("applyTaskFilters — busca por título", () => {
  const tasks = [
    { ...task("t1", "andrea"), title: "Relatório financeiro mensal" },
    { ...task("t2", "haila"), title: "Planejamento de marketing" },
  ];

  it("busca por parte do título sem diferenciar maiúsculas e minúsculas", () => {
    const result = applyTaskFilters(tasks, { titleQuery: "FINANCEIRO" });
    expect(result.map((item) => item.id)).toEqual(["t1"]);
  });

  it("ignora espaços nas extremidades da busca", () => {
    const result = applyTaskFilters(tasks, { titleQuery: "  marketing  " });
    expect(result.map((item) => item.id)).toEqual(["t2"]);
  });
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
