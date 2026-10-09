import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, PenSquare, Filter as FilterIcon, RotateCcw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAssignableProfiles, useColumns } from "@/hooks/use-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { dateFilterLabels, matchDateFilter, type DateFilter } from "@/lib/task-utils";

export type TaskScope = "all" | "mine" | "created";
const COMPLETED_STATUS_FILTER = "completed";
const COLUMN_STATUS_PREFIX = "column:";

interface Filters {
  /** Busca compartilhada do cabeçalho de tarefas. */
  titleQuery?: string;
  scope?: TaskScope;
  date?: DateFilter;
  assignee?: string;
  priority?: string;
  status?: string;
  /** Id do ambiente. Só aparece para quem pertence a mais de um. */
  workspace?: string;
}

const DATE_OPTIONS: DateFilter[] = [
  "all",
  "due_today",
  "tomorrow",
  "this_week",
  "this_month",
  "overdue",
  "no_due",
  "pending",
  "completed",
];

export function TaskFilters({
  filters,
  onChange,
  children,
  actions,
  hideAssignee = false,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  children?: ReactNode;
  actions?: ReactNode;
  hideAssignee?: boolean;
}) {
  // The assignee filter must only expose users who can receive tasks.
  // This query is role-based in the database (admin and collaborator only).
  const { data: assignableProfiles } = useAssignableProfiles();
  const { data: columns = [] } = useColumns();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const scope: TaskScope = filters.scope ?? "all";
  const dateVal: DateFilter = filters.date ?? "all";

  const activeCount = [
    dateVal !== "all",
    !hideAssignee && !!filters.assignee,
    !!filters.priority,
    !!filters.status,
    !!filters.workspace,
  ].filter(Boolean).length;

  const clearAll = () => onChange({});
  const assigneeName = assignableProfiles?.find((profile) => profile.id === filters.assignee);
  const activeFilters = [
    filters.workspace ? { key: "workspace", label: "Ambiente selecionado" } : null,
    !hideAssignee && filters.assignee
      ? {
          key: "assignee",
          label: `Responsável: ${assigneeName?.full_name || assigneeName?.email || "Usuário"}`,
        }
      : null,
    dateVal !== "all" ? { key: "date", label: `Período: ${dateFilterLabels[dateVal]}` } : null,
    filters.priority
      ? {
          key: "priority",
          label: `Prioridade: ${
            { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" }[filters.priority] ??
            filters.priority
          }`,
        }
      : null,
    filters.status
      ? {
          key: "status",
          label: `Status: ${
            filters.status === COMPLETED_STATUS_FILTER
              ? "Concluídos"
              : columns.find((column) => `${COLUMN_STATUS_PREFIX}${column.id}` === filters.status)
                  ?.name || "Selecionado"
          }`,
        }
      : null,
  ].filter((item): item is { key: keyof Filters; label: string } => Boolean(item));

  const removeFilter = (key: keyof Filters) => onChange({ ...filters, [key]: undefined });

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-sm 2xl:flex-nowrap">
      {/* Scope segmented */}
      <div className="inline-flex max-w-full shrink-0 overflow-x-auto rounded-full border bg-muted/40 p-0.5">
        <ScopeBtn
          active={scope === "all"}
          onClick={() => onChange({ ...filters, scope: undefined, assignee: undefined })}
          icon={<Users className="h-3.5 w-3.5" />}
        >
          Todas
        </ScopeBtn>
        <ScopeBtn
          active={scope === "mine"}
          onClick={() => onChange({ ...filters, scope: "mine", assignee: undefined })}
          icon={<UserCheck className="h-3.5 w-3.5" />}
        >
          Atribuídas a mim
        </ScopeBtn>
        <ScopeBtn
          active={scope === "created"}
          onClick={() => onChange({ ...filters, scope: "created", assignee: undefined })}
          icon={<PenSquare className="h-3.5 w-3.5" />}
        >
          Criadas por mim
        </ScopeBtn>
      </div>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-full px-3.5 text-xs"
          >
            <FilterIcon className="h-3.5 w-3.5" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {activeCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl p-0 sm:max-w-5xl">
          <div className="space-y-7 p-5 sm:p-7">
            <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 text-left">
              <div>
                <DialogTitle className="text-xl">Filtros das tarefas</DialogTitle>
                <DialogDescription className="mt-1">
                  Ajuste a lista e a visualização.
                </DialogDescription>
              </div>
              <Button variant="outline" className="mr-6 shrink-0 rounded-full" onClick={clearAll}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </DialogHeader>

            <section className="grid items-end gap-x-5 gap-y-5 md:grid-cols-2">
              {children}
              {!hideAssignee && (
                <FilterField label="Responsável">
                  <Select
                    value={filters.assignee ?? "all"}
                    onValueChange={(v) =>
                      onChange({ ...filters, assignee: v === "all" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="Todos os responsáveis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os responsáveis</SelectItem>
                      {assignableProfiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              <div className="grid min-w-0 grid-cols-3 gap-3 md:col-span-2">
                <FilterField label="Período" compact>
                  <Select
                    value={dateVal}
                    onValueChange={(v) => onChange({ ...filters, date: v as DateFilter })}
                  >
                    <SelectTrigger className="h-9 w-full min-w-0 rounded-lg px-3 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_OPTIONS.map((date) => (
                        <SelectItem key={date} value={date}>
                          {dateFilterLabels[date]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Prioridade" compact>
                  <Select
                    value={filters.priority ?? "all"}
                    onValueChange={(v) =>
                      onChange({ ...filters, priority: v === "all" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-9 w-full min-w-0 rounded-lg px-3 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Status" compact>
                  <Select
                    value={filters.status ?? "all"}
                    onValueChange={(v) =>
                      onChange({ ...filters, status: v === "all" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-9 w-full min-w-0 rounded-lg px-3 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={`${COLUMN_STATUS_PREFIX}${column.id}`}>
                          {column.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={COMPLETED_STATUS_FILTER}>Concluídos</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              </div>
            </section>

            <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
              <span className="mr-1 text-sm font-semibold">Filtros ativos:</span>
              {activeFilters.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhum filtro aplicado</span>
              ) : (
                activeFilters.map((item) => (
                  <Badge
                    key={item.key}
                    variant="secondary"
                    className="h-9 gap-2 rounded-full px-4 text-sm font-medium"
                  >
                    {item.label}
                    <button
                      type="button"
                      onClick={() => removeFilter(item.key)}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                      aria-label={`Remover ${item.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {actions ? (
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "min-w-0 space-y-1.5" : "min-w-0 space-y-2"}>
      <span
        className={`block font-semibold text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ScopeBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function applyTaskFilters<
  T extends {
    id: string;
    title: string;
    assignee_id: string | null;
    priority: string | null;
    column_id: string | null;
    status_id: string | null;
    created_by?: string | null;
    due_date: string | null;
    status: string | null;
    completed_at: string | null;
    workspace_id?: string | null;
  },
>(
  tasks: T[],
  f: Filters,
  opts?: {
    userId?: string | null;
    subtaskAssigneeTaskIds?: Set<string> | null;
    collaboratorTaskIds?: Set<string> | null;
    subtaskAssigneeTaskIdsByUser?: Map<string, Set<string>> | null;
    /** Tarefas em que cada usuário é colaborador (para o filtro por pessoa). */
    collaboratorTaskIdsByUser?: Map<string, Set<string>> | null;
    /** Parent tasks that have a subtask matching the active due-date filter. */
    subtaskDateFilterTaskIds?: Set<string> | null;
    restrictToCurrentUserParticipation?: boolean;
  },
) {
  const uid = opts?.userId ?? null;
  const subIds = opts?.subtaskAssigneeTaskIds ?? null;
  const collaboratorIds = opts?.collaboratorTaskIds ?? null;
  return tasks.filter((t) => {
    const titleQuery = f.titleQuery?.trim().toLocaleLowerCase("pt-BR");
    if (titleQuery && !t.title.toLocaleLowerCase("pt-BR").includes(titleQuery)) return false;
    if (opts?.restrictToCurrentUserParticipation) {
      if (!uid) return false;
      const participatesInTask =
        t.assignee_id === uid ||
        !!subIds?.has(t.id) ||
        !!collaboratorIds?.has(t.id) ||
        // Creating a task for another person is not participation. Keep it
        // available only through the explicit "Criadas por mim" filter.
        (f.scope === "created" && t.created_by === uid);
      if (!participatesInTask) return false;
    }
    if (f.scope === "mine") {
      if (!uid) return false;
      const participatesInTask =
        t.assignee_id === uid || !!subIds?.has(t.id) || !!collaboratorIds?.has(t.id);
      if (!participatesInTask) return false;
    }
    if (f.scope === "created" && (!uid || t.created_by !== uid)) return false;

    if (f.date && f.date !== "all" && !matchDateFilter(t, f.date)) {
      const supportsSubtaskDueDates = [
        "today",
        "due_today",
        "tomorrow",
        "this_week",
        "this_month",
        "overdue",
      ].includes(f.date);
      if (!supportsSubtaskDueDates || !opts?.subtaskDateFilterTaskIds?.has(t.id)) return false;
    }
    if (f.assignee) {
      const assigneeSubtasks = opts?.subtaskAssigneeTaskIdsByUser?.get(f.assignee);
      // Include direct assignments, collaborations and subtasks of the chosen
      // person. Merely creating a task for another person does not make it
      // part of that user's personal workload.
      const isCollaborator =
        !!opts?.collaboratorTaskIdsByUser?.get(f.assignee)?.has(t.id) ||
        (f.assignee === uid && !!collaboratorIds?.has(t.id));
      if (t.assignee_id !== f.assignee && !assigneeSubtasks?.has(t.id) && !isCollaborator) {
        return false;
      }
    }
    if (f.workspace && t.workspace_id !== f.workspace) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.status === COMPLETED_STATUS_FILTER && t.status !== "done" && !t.completed_at)
      return false;
    if (f.status?.startsWith(COLUMN_STATUS_PREFIX)) {
      const columnId = f.status.slice(COLUMN_STATUS_PREFIX.length);
      if (t.column_id !== columnId || t.status === "done" || !!t.completed_at) return false;
    } else if (f.status && f.status !== COMPLETED_STATUS_FILTER && t.status_id !== f.status) {
      // Keeps legacy saved filter values functional while the selector now uses Kanban columns.
      return false;
    }
    return true;
  });
}

export type { Filters as TaskFilterValue };
