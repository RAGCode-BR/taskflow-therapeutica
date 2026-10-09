import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { KanbanSquare, List as ListIcon, Calendar as CalIcon, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskTitleSearchProvider } from "@/components/TaskTitleSearchProvider";
import { useTaskTitleSearch } from "@/hooks/use-task-title-search";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksLayout,
});

function TasksLayout() {
  return (
    <TaskTitleSearchProvider>
      <TasksLayoutContent />
    </TaskTitleSearchProvider>
  );
}

function TasksLayoutContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { titleQuery, setTitleQuery } = useTaskTitleSearch();
  const views = [
    { to: "/tasks/kanban", label: "Kanban", icon: KanbanSquare },
    { to: "/tasks/list", label: "Lista", icon: ListIcon },
    { to: "/tasks/calendar", label: "Calendário", icon: CalIcon },
  ] as const;
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 flex flex-col gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="relative w-full min-w-0 lg:max-w-xl xl:max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
            placeholder="Buscar tarefa pelo título..."
            aria-label="Buscar tarefa pelo título"
            className="h-9 rounded-full bg-card pl-9 pr-9 text-sm shadow-sm"
          />
          {titleQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
              onClick={() => setTitleQuery("")}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex max-w-full shrink-0 items-center gap-2 self-end overflow-x-auto lg:self-auto">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Visualizar
          </span>
          <div className="inline-flex shrink-0 rounded-lg border bg-muted/35 p-0.5">
            {views.map((v) => {
              const active = pathname === v.to || pathname.startsWith(v.to + "/");
              const Icon = v.icon;
              return (
                <Link
                  key={v.to}
                  to={v.to}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition sm:text-sm ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {v.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
