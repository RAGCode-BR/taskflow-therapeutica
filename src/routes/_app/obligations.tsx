/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase types are regenerated after the migration is applied. */
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  ExternalLink,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { enqueueOfflineOperation, isOffline } from "@/lib/offline-sync";
import {
  useAssignableProfiles,
  useColumns,
  useProfiles,
  useTaskStatuses,
  type KanbanColumn,
  type Profile,
  type Task,
  type TaskStatus,
} from "@/hooks/use-data";
import { useWorkspaceTasks } from "@/hooks/use-workspace-tasks";
import {
  useObligationOccurrences,
  useObligationDepartments,
  useObligations,
  type Obligation,
  type ObligationDepartment,
  type ObligationOccurrence,
} from "@/hooks/use-obligations";
import { ObligationDialog } from "@/components/ObligationDialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { TaskDialog } from "@/components/TaskDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/obligations")({ component: ObligationsPage });

const todayKey = () => format(new Date(), "yyyy-MM-dd");

type DeleteTarget =
  | { scope: "occurrences"; occurrences: ObligationOccurrence[] }
  | { scope: "series"; obligation: Obligation }
  | { scope: "series-batch"; obligations: Obligation[] }
  | { scope: "all" };

type BulkTaskUpdates = {
  title?: string;
  description?: string | null;
  status?: Task["status"];
  status_id?: string | null;
  completed_at?: string | null;
  column_id?: string | null;
  assignee_id?: string | null;
  priority?: Task["priority"];
  due_date?: string | null;
  due_time?: string | null;
};

type BulkTaskChanges = {
  updates: BulkTaskUpdates;
  collaboratorIds?: string[];
  dueDateReason?: string;
};

function ObligationsPage() {
  const { hasPermission, loading, activeWorkspace, user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: obligations = [],
    isLoading: loadingObligations,
    error: obligationsError,
  } = useObligations();
  const {
    data: occurrences = [],
    isLoading: loadingOccurrences,
    error: occurrencesError,
  } = useObligationOccurrences();
  const { data: profiles = [] } = useProfiles();
  const { data: assignableProfiles = [] } = useAssignableProfiles();
  const { data: columns = [] } = useColumns();
  const { data: taskStatuses = [] } = useTaskStatuses();
  const { data: tasks = [] } = useWorkspaceTasks();
  const { data: departments = [] } = useObligationDepartments();
  const materializedWorkspace = useRef<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [workingOccurrenceId, setWorkingOccurrenceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedOccurrenceIds, setSelectedOccurrenceIds] = useState<string[]>([]);
  const [bulkEditOccurrenceIds, setBulkEditOccurrenceIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [meetingOccurrence, setMeetingOccurrence] = useState<ObligationOccurrence | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [taskDefaults, setTaskDefaults] = useState<{
    title?: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    assigneeId?: string | null;
    priority?: Task["priority"];
  }>();
  const [taskOccurrenceId, setTaskOccurrenceId] = useState<string | null>(null);

  useEffect(() => {
    // A materialização é uma rotina do servidor. Offline, a última lista de
    // vencimentos persistida é exibida sem tentar chamar o banco.
    if (isOffline() || !activeWorkspace?.id || materializedWorkspace.current === activeWorkspace.id)
      return;
    materializedWorkspace.current = activeWorkspace.id;
    void (async () => {
      const { error } = await (supabase as any).rpc("materialize_obligations", {
        p_horizon_days: 365,
      });
      if (error) {
        materializedWorkspace.current = null;
        if (/failed to fetch/i.test(error.message ?? "")) return;
        toast.error(`Não foi possível atualizar os próximos vencimentos: ${error.message}`);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    })();
  }, [activeWorkspace?.id, queryClient]);

  const obligationById = useMemo(
    () => new Map(obligations.map((obligation) => [obligation.id, obligation])),
    [obligations],
  );
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const agendaTasksByOccurrence = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.obligation_occurrence_id) return;
      const current = grouped.get(task.obligation_occurrence_id) ?? [];
      current.push(task);
      grouped.set(task.obligation_occurrence_id, current);
    });
    occurrences.forEach((occurrence) => {
      if (!occurrence.task_id) return;
      const legacyTask = taskById.get(occurrence.task_id);
      if (!legacyTask) return;
      const current = grouped.get(occurrence.id) ?? [];
      if (!current.some((task) => task.id === legacyTask.id)) current.push(legacyTask);
      grouped.set(occurrence.id, current);
    });
    return grouped;
  }, [occurrences, taskById, tasks]);

  const activeOccurrences = useMemo(
    () =>
      occurrences.filter((occurrence) => {
        if (occurrence.status === "skipped") return false;
        const obligation = obligationById.get(occurrence.obligation_id);
        if (!obligation) return false;
        if (departmentFilter !== "all" && obligation.department_id !== departmentFilter)
          return false;
        if (assigneeFilter !== "all" && obligation.assignee_id !== assigneeFilter) return false;
        const term = search.trim().toLocaleLowerCase("pt-BR");
        if (!term) return true;
        const department = departmentById.get(obligation.department_id ?? "");
        return `${obligation.title} ${department?.name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(term);
      }),
    [
      assigneeFilter,
      departmentById,
      departmentFilter,
      obligationById,
      occurrences,
      search,
    ],
  );

  const today = todayKey();
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const pendingOccurrences = activeOccurrences.filter(
    (occurrence) => occurrence.status !== "completed" && occurrence.status !== "skipped",
  );
  const pendingGroups = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ occurrence: ObligationOccurrence; obligation: Obligation }>
    >();
    pendingOccurrences.forEach((occurrence) => {
      const obligation = obligationById.get(occurrence.obligation_id);
      if (!obligation) return;
      const key = obligation.department_id ?? "without-department";
      const group = groups.get(key) ?? [];
      group.push({ occurrence, obligation });
      groups.set(key, group);
    });
    return [...groups.entries()]
      .map(([departmentId, items]) => ({
        departmentId,
        department: departmentById.get(departmentId) ?? null,
        items,
      }))
      .sort((a, b) =>
        (a.department?.name ?? "Sem departamento").localeCompare(
          b.department?.name ?? "Sem departamento",
          "pt-BR",
        ),
      );
  }, [departmentById, obligationById, pendingOccurrences]);
  const obligationGroups = useMemo(() => {
    const groups = new Map<string, Obligation[]>();
    obligations.forEach((obligation) => {
      const key = obligation.department_id ?? "without-department";
      const group = groups.get(key) ?? [];
      group.push(obligation);
      groups.set(key, group);
    });
    return [...groups.entries()]
      .map(([departmentId, items]) => ({
        departmentId,
        department: departmentById.get(departmentId) ?? null,
        items,
      }))
      .sort((a, b) =>
        (a.department?.name ?? "Sem departamento").localeCompare(
          b.department?.name ?? "Sem departamento",
          "pt-BR",
        ),
      );
  }, [departmentById, obligations]);
  const overdueCount = pendingOccurrences.filter(
    (occurrence) => occurrence.due_date < today,
  ).length;
  const todayCount = pendingOccurrences.filter(
    (occurrence) => occurrence.due_date === today,
  ).length;
  const weekCount = pendingOccurrences.filter(
    (occurrence) => occurrence.due_date > today && occurrence.due_date <= nextWeek,
  ).length;
  const completedMonthCount = activeOccurrences.filter(
    (occurrence) =>
      occurrence.status === "completed" &&
      occurrence.completed_at &&
      isSameMonth(new Date(occurrence.completed_at), new Date()),
  ).length;

  const openMeeting = (occurrence: ObligationOccurrence) => {
    setMeetingOccurrence(occurrence);
    setMeetingDialogOpen(true);
  };

  const createAgendaTask = (occurrence: ObligationOccurrence) => {
    const obligation = obligationById.get(occurrence.obligation_id);
    if (!obligation) return;
    setEditingTask(null);
    setTaskOccurrenceId(occurrence.id);
    setTaskDefaults({
      dueDate: occurrence.due_date,
      dueTime: occurrence.due_time?.slice(0, 5) ?? "",
      assigneeId: obligation.assignee_id,
      priority: obligation.priority,
    });
    setTaskDialogOpen(true);
  };

  const openAgendaTask = (task: Task, occurrence: ObligationOccurrence) => {
    setEditingTask(task);
    setTaskDefaults(undefined);
    setTaskOccurrenceId(task.obligation_occurrence_id ?? occurrence.id);
    setTaskDialogOpen(true);
  };

  const completeOccurrence = async (occurrence: ObligationOccurrence) => {
    setWorkingOccurrenceId(occurrence.id);
    const { error } = await (supabase as any).rpc("complete_obligation_occurrence", {
      target_occurrence_id: occurrence.id,
    });
    setWorkingOccurrenceId(null);
    if (error) return toast.error(error.message);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);
    setMeetingDialogOpen(false);
    toast.success("Reunião encerrada");
  };

  const toggleOccurrenceSelection = (occurrenceId: string) => {
    setSelectedOccurrenceIds((current) =>
      current.includes(occurrenceId)
        ? current.filter((id) => id !== occurrenceId)
        : [...current, occurrenceId],
    );
  };

  const selectGroupOccurrences = (occurrenceIds: string[], selected: boolean) => {
    setSelectedOccurrenceIds((current) => {
      const next = new Set(current);
      occurrenceIds.forEach((id) => (selected ? next.add(id) : next.delete(id)));
      return [...next];
    });
  };

  const saveBulkTaskChanges = async ({
    updates,
    collaboratorIds,
    dueDateReason,
  }: BulkTaskChanges) => {
    const selectedOccurrences = bulkEditOccurrenceIds
      .map((id) => occurrences.find((occurrence) => occurrence.id === id))
      .filter((occurrence): occurrence is ObligationOccurrence => Boolean(occurrence));
    const existingTaskIds = selectedOccurrences.flatMap((occurrence) =>
      (agendaTasksByOccurrence.get(occurrence.id) ?? []).map((task) => task.id),
    );
    const occurrencesToMaterialize = selectedOccurrences.filter((occurrence) => {
      const obligation = obligationById.get(occurrence.obligation_id);
      return (
        !obligation?.meeting_mode && (!occurrence.task_id || !taskById.has(occurrence.task_id))
      );
    });

    const creationResults = await Promise.all(
      occurrencesToMaterialize.map((occurrence) =>
        (supabase as any).rpc("create_obligation_task", {
          target_occurrence_id: occurrence.id,
        }),
      ),
    );
    const creationError = creationResults.find((result) => result.error)?.error;
    if (creationError) {
      toast.error(`Não foi possível preparar todas as tarefas: ${creationError.message}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      return false;
    }

    const taskIds = [
      ...new Set([
        ...existingTaskIds,
        ...creationResults
          .map((result) => result.data)
          .filter((taskId): taskId is string => typeof taskId === "string"),
      ]),
    ];
    if (taskIds.length === 0) {
      toast.error("Nenhuma tarefa disponível para editar.");
      return false;
    }

    const { data: currentTasks, error: currentTasksError } = await supabase
      .from("tasks")
      .select("id, due_date, created_by, assignee_id")
      .in("id", taskIds);
    if (currentTasksError) {
      toast.error(currentTasksError.message);
      return false;
    }

    if (
      collaboratorIds &&
      !isAdmin &&
      (currentTasks ?? []).some(
        (task: { created_by: string | null; assignee_id: string | null }) =>
          task.created_by !== user?.id && task.assignee_id !== user?.id,
      )
    ) {
      toast.error(
        "Você precisa ser criador ou responsável por todas as tarefas para substituir os participantes.",
      );
      return false;
    }

    if (updates.status === "done") {
      const { data: incompleteSubtasks, error: subtasksError } = await supabase
        .from("subtasks")
        .select("id")
        .in("task_id", taskIds)
        .eq("done", false)
        .limit(1);
      if (subtasksError) {
        toast.error(subtasksError.message);
        return false;
      }
      if (incompleteSubtasks?.length) {
        toast.error("Conclua as subtarefas pendentes antes de concluir as tarefas selecionadas.");
        return false;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("tasks").update(updates).in("id", taskIds);
      if (error) {
        toast.error(error.message);
        return false;
      }
    }

    if (collaboratorIds) {
      const { error: deleteCollaboratorsError } = await (supabase.from("task_collaborators") as any)
        .delete()
        .in("task_id", taskIds);
      if (deleteCollaboratorsError) {
        toast.error(deleteCollaboratorsError.message);
        return false;
      }
      if (collaboratorIds.length > 0) {
        const { error: insertCollaboratorsError } = await (
          supabase.from("task_collaborators") as any
        ).insert(
          taskIds.flatMap((taskId) =>
            collaboratorIds.map((collaboratorId) => ({
              task_id: taskId,
              collaborator_id: collaboratorId,
              added_by: user?.id ?? null,
            })),
          ),
        );
        if (insertCollaboratorsError) {
          toast.error(insertCollaboratorsError.message);
          return false;
        }
      }
    }

    if ("due_date" in updates && user?.id && dueDateReason) {
      const changedDeadlines = (currentTasks ?? []).filter(
        (task: { id: string; due_date: string | null }) =>
          task.due_date && task.due_date !== updates.due_date,
      );
      if (changedDeadlines.length > 0) {
        const { error: deadlineHistoryError } = await supabase.from("task_due_date_changes").insert(
          changedDeadlines.map((task: { id: string; due_date: string | null }) => ({
            task_id: task.id,
            user_id: user.id,
            old_due_date: task.due_date,
            new_due_date: updates.due_date ?? null,
            reason: dueDateReason,
          })),
        );
        if (deadlineHistoryError) {
          toast.warning("Prazos atualizados, mas não foi possível registrar a justificativa.");
        }
      }
    }
    if (user?.id) {
      const { error: historyError } = await supabase.from("task_history").insert(
        taskIds.map((taskId) => ({
          task_id: taskId,
          user_id: user.id,
          action: "updated",
          details: {
            source: "obligations_bulk_edit",
            fields: [...Object.keys(updates), ...(collaboratorIds ? ["collaborators"] : [])],
          },
        })),
      );
      if (historyError) console.error("Não foi possível registrar a edição em lote", historyError);
    }

    setSelectedOccurrenceIds((current) =>
      current.filter((id) => !bulkEditOccurrenceIds.includes(id)),
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);
    toast.success(`${taskIds.length} tarefa${taskIds.length === 1 ? " editada" : "s editadas"}`);
    return true;
  };

  const setObligationActive = async (obligation: Obligation, isActive: boolean) => {
    if (user && activeWorkspace?.id && isOffline()) {
      await enqueueOfflineOperation({
        userId: user.id,
        entity: "record",
        action: "update",
        entityId: obligation.id,
        payload: { table: "obligations", patch: { is_active: isActive } },
      });
      queryClient.setQueryData<Obligation[]>(["obligations", activeWorkspace.id], (current = []) =>
        current.map((item) =>
          item.id === obligation.id ? { ...item, is_active: isActive } : item,
        ),
      );
      toast.success("Alteração salva neste aparelho. Será sincronizada ao reconectar.");
      return;
    }
    const { error } = await (supabase.from("obligations" as any) as any)
      .update({ is_active: isActive })
      .eq("id", obligation.id);
    if (error) return toast.error(error.message);
    if (isActive) {
      const { error: refreshError } = await (supabase as any).rpc("refresh_obligation", {
        target_obligation_id: obligation.id,
      });
      if (refreshError) {
        return toast.error(
          `Obrigação ativada, mas os próximos prazos não foram gerados: ${refreshError.message}`,
        );
      }
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["obligations"] }),
      queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
    ]);
    toast.success(isActive ? "Obrigação ativada" : "Obrigação pausada");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    if (user && activeWorkspace?.id && isOffline()) {
      const target = deleteTarget;
      if (target.scope === "occurrences") {
        await Promise.all(
          target.occurrences.map((occurrence) =>
            enqueueOfflineOperation({
              userId: user.id,
              entity: "record",
              action: "update",
              entityId: occurrence.id,
              payload: { table: "obligation_occurrences", patch: { status: "skipped" } },
            }),
          ),
        );
        queryClient.setQueryData<any[]>(
          ["obligation-occurrences", activeWorkspace.id],
          (current = []) =>
            current.map((item) =>
              target.occurrences.some((occurrence) => occurrence.id === item.id)
                ? { ...item, status: "skipped" }
                : item,
            ),
        );
      } else {
        const ids =
          target.scope === "series"
            ? [target.obligation.id]
            : target.scope === "series-batch"
              ? target.obligations.map((item) => item.id)
              : obligations.map((item) => item.id);
        await Promise.all(
          ids.map((id) =>
            enqueueOfflineOperation({
              userId: user.id,
              entity: "record",
              action: "delete",
              entityId: id,
              payload: { table: "obligations" },
            }),
          ),
        );
        queryClient.setQueryData<Obligation[]>(
          ["obligations", activeWorkspace.id],
          (current = []) => current.filter((item) => !ids.includes(item.id)),
        );
      }
      setDeleting(false);
      setDeleteTarget(null);
      toast.success("Exclusão salva neste aparelho. Será sincronizada ao reconectar.");
      return;
    }
    let error: { message: string } | null = null;

    if (deleteTarget.scope === "occurrences") {
      const result = await (supabase.from("obligation_occurrences" as any) as any)
        .update({ status: "skipped" })
        .in(
          "id",
          deleteTarget.occurrences.map((occurrence) => occurrence.id),
        );
      error = result.error;
    } else if (deleteTarget.scope === "series") {
      const result = await (supabase.from("obligations" as any) as any)
        .delete()
        .eq("id", deleteTarget.obligation.id);
      error = result.error;
    } else if (deleteTarget.scope === "series-batch") {
      const result = await (supabase.from("obligations" as any) as any).delete().in(
        "id",
        deleteTarget.obligations.map((obligation) => obligation.id),
      );
      error = result.error;
    } else if (deleteTarget.scope === "all" && activeWorkspace?.id) {
      const result = await (supabase.from("obligations" as any) as any)
        .delete()
        .eq("workspace_id", activeWorkspace.id);
      error = result.error;
    }

    setDeleting(false);
    if (error) return toast.error(error.message);
    const scope = deleteTarget.scope;
    if (scope === "occurrences") {
      const deletedIds = new Set(deleteTarget.occurrences.map((occurrence) => occurrence.id));
      setSelectedOccurrenceIds((current) => current.filter((id) => !deletedIds.has(id)));
    } else if (scope === "series") {
      const deletedOccurrenceIds = new Set(
        occurrences
          .filter((occurrence) => occurrence.obligation_id === deleteTarget.obligation.id)
          .map((occurrence) => occurrence.id),
      );
      setSelectedOccurrenceIds((current) => current.filter((id) => !deletedOccurrenceIds.has(id)));
    } else if (scope === "series-batch") {
      const deletedObligationIds = new Set(
        deleteTarget.obligations.map((obligation) => obligation.id),
      );
      const deletedOccurrenceIds = new Set(
        occurrences
          .filter((occurrence) => deletedObligationIds.has(occurrence.obligation_id))
          .map((occurrence) => occurrence.id),
      );
      setSelectedOccurrenceIds((current) => current.filter((id) => !deletedOccurrenceIds.has(id)));
    } else {
      setSelectedOccurrenceIds([]);
    }
    setDeleteTarget(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["obligations"] }),
      queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
    ]);
    toast.success(
      scope === "occurrences"
        ? "Vencimentos selecionados excluídos"
        : scope === "series"
          ? "Obrigação e seus vencimentos foram excluídos"
          : scope === "series-batch"
            ? "Obrigação e todos os seus vencimentos foram excluídos"
            : "Todas as obrigações foram excluídas",
    );
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (!hasPermission("obligations")) return <Navigate to="/dashboard" />;

  const pageError = obligationsError || occurrencesError;

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Obrigações</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize reuniões recorrentes por departamento, suas pautas e checklists.
          </p>
        </div>
        <Button
          className="h-9 rounded-full px-4 shadow-sm"
          onClick={() => {
            setEditingObligation(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova reunião recorrente
        </Button>
      </header>

      {pageError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar as obrigações: {(pageError as Error).message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Atrasadas"
          value={overdueCount}
          icon={AlertTriangle}
          tone="destructive"
        />
        <MetricCard label="Vencem hoje" value={todayCount} icon={Clock3} tone="warning" />
        <MetricCard
          label="Próximos 7 dias"
          value={weekCount}
          icon={CalendarCheck2}
          tone="primary"
        />
        <MetricCard
          label="Concluídas no mês"
          value={completedMonthCount}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar reunião ou departamento..."
            className="pl-9"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os departamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name || profile.email || "Usuário"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {loadingObligations || loadingOccurrences ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando vencimentos...
            </div>
          ) : pendingOccurrences.length === 0 ? (
            <EmptyState
              title="Nenhuma reunião pendente"
              description="Crie uma rotina para começar a acompanhar as próximas reuniões."
            />
          ) : (
            <div className="space-y-3">
              {pendingGroups.map(({ departmentId, department, items }, index) => {
                const occurrenceIds = items.map((item) => item.occurrence.id);
                const selectedItems = items.filter((item) =>
                  selectedOccurrenceIds.includes(item.occurrence.id),
                );
                const selectedIds = selectedItems.map((item) => item.occurrence.id);
                const selectedAgendaCount = selectedIds.reduce(
                  (count, occurrenceId) =>
                    count + (agendaTasksByOccurrence.get(occurrenceId)?.length ?? 0),
                  0,
                );
                const selectedObligations = [
                  ...new Map(
                    selectedItems.map((item) => [item.obligation.id, item.obligation]),
                  ).values(),
                ];
                const allSelected =
                  occurrenceIds.length > 0 && selectedIds.length === occurrenceIds.length;
                return (
                  <DepartmentSection
                    key={departmentId}
                    department={department}
                    subtitle={`${new Set(items.map((item) => item.obligation.id)).size} rotina(s) · ${items.length} reunião(ões)`}
                    defaultOpen={index === 0}
                    actions={
                      <div className="flex shrink-0 items-center gap-2">
                        <label className="hidden cursor-pointer items-center gap-2 text-xs text-muted-foreground sm:flex">
                          <Checkbox
                            checked={
                              allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false
                            }
                            onCheckedChange={(checked) =>
                              selectGroupOccurrences(occurrenceIds, checked === true)
                            }
                          />
                          Todas
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={selectedAgendaCount === 0}
                          onClick={() => {
                            setBulkEditOccurrenceIds(selectedIds);
                            setBulkEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar pautas
                          {selectedAgendaCount > 0 ? ` (${selectedAgendaCount})` : ""}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={selectedIds.length === 0}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  scope: "occurrences",
                                  occurrences: selectedItems.map((item) => item.occurrence),
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir somente as reuniões selecionadas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  scope: "series-batch",
                                  obligations: selectedObligations,
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir obrigação
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    }
                  >
                    {items.map(({ occurrence, obligation }) => {
                      const agendaTasks = agendaTasksByOccurrence.get(occurrence.id) ?? [];
                      const task = agendaTasks[0] ?? null;
                      return (
                        <OccurrenceRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          obligation={obligation}
                          department={department}
                          agendaTasks={agendaTasks}
                          assignee={
                            profileById.get(task?.assignee_id ?? obligation.assignee_id ?? "") ??
                            null
                          }
                          selected={selectedOccurrenceIds.includes(occurrence.id)}
                          working={workingOccurrenceId === occurrence.id}
                          onSelectedChange={() => toggleOccurrenceSelection(occurrence.id)}
                          onOpenMeeting={() => openMeeting(occurrence)}
                          onComplete={() => void completeOccurrence(occurrence)}
                        />
                      );
                    })}
                  </DepartmentSection>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <ObligationsCalendar
            cursor={calendarCursor}
            onCursorChange={setCalendarCursor}
            occurrences={activeOccurrences}
            obligationById={obligationById}
            departmentById={departmentById}
            onOccurrenceClick={(occurrence) => {
              openMeeting(occurrence);
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {obligations.length === 0 ? (
            <EmptyState
              title="Nenhuma reunião recorrente configurada"
              description="Cadastre a primeira rotina de reunião de um departamento."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
                <p className="text-sm text-muted-foreground">
                  {obligations.length} reunião(ões) recorrente(s) neste ambiente
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteTarget({ scope: "all" })}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Excluir todas
                </Button>
              </div>
              <div className="space-y-3">
                {obligationGroups.map(({ departmentId, department, items }, index) => (
                  <DepartmentSection
                    key={departmentId}
                    department={department}
                    subtitle={`${items.length} reunião(ões) recorrente(s)`}
                    defaultOpen={index === 0}
                  >
                    <div className="grid gap-3 lg:grid-cols-2">
                      {items.map((obligation) => {
                        const assignee = profileById.get(obligation.assignee_id ?? "");
                        const nextOccurrence = occurrences.find(
                          (occurrence) =>
                            occurrence.obligation_id === obligation.id &&
                            occurrence.status !== "completed" &&
                            occurrence.status !== "skipped" &&
                            occurrence.due_date >= today,
                        );
                        return (
                          <Card key={obligation.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-3 w-3 shrink-0 rounded-sm"
                                    style={{ backgroundColor: department?.color || "#64748b" }}
                                  />
                                  <h3 className="truncate font-semibold">{obligation.title}</h3>
                                  {!obligation.is_active && (
                                    <Badge variant="outline">Pausada</Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatRecurrence(obligation)}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Editar"
                                  onClick={() => {
                                    setEditingObligation(obligation);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  title="Excluir obrigação"
                                  onClick={() => setDeleteTarget({ scope: "series", obligation })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={obligation.is_active ? "Pausar" : "Ativar"}
                                  onClick={() =>
                                    void setObligationActive(obligation, !obligation.is_active)
                                  }
                                >
                                  {obligation.is_active ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                              <div>
                                <span className="block text-muted-foreground">Responsável</span>
                                <span className="mt-1 block font-medium">
                                  {assignee?.full_name || assignee?.email || "Sem responsável"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-muted-foreground">
                                  Próximo vencimento
                                </span>
                                <span className="mt-1 block font-medium">
                                  {nextOccurrence
                                    ? formatDate(nextOccurrence.due_date)
                                    : "Sem data futura"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-muted-foreground">Pautas</span>
                                <span className="mt-1 block font-medium">
                                  Criadas dentro de cada reunião
                                </span>
                              </div>
                              <div>
                                <span className="block text-muted-foreground">Período</span>
                                <span className="mt-1 block font-medium">
                                  Desde {formatDate(obligation.start_date)}
                                  {obligation.end_date
                                    ? ` até ${formatDate(obligation.end_date)}`
                                    : " · sem término"}
                                </span>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </DepartmentSection>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ObligationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        obligation={editingObligation}
      />
      <MeetingOverviewDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        occurrence={meetingOccurrence}
        obligation={
          meetingOccurrence ? (obligationById.get(meetingOccurrence.obligation_id) ?? null) : null
        }
        department={
          meetingOccurrence
            ? (departmentById.get(
                obligationById.get(meetingOccurrence.obligation_id)?.department_id ?? "",
              ) ?? null)
            : null
        }
        tasks={meetingOccurrence ? (agendaTasksByOccurrence.get(meetingOccurrence.id) ?? []) : []}
        onCreateAgenda={() => meetingOccurrence && createAgendaTask(meetingOccurrence)}
        onOpenTask={(task) => meetingOccurrence && openAgendaTask(task, meetingOccurrence)}
        onComplete={() => meetingOccurrence && void completeOccurrence(meetingOccurrence)}
      />
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        obligationOccurrenceId={taskOccurrenceId}
        defaults={taskDefaults}
      />
      <BulkTaskEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        taskCount={bulkEditOccurrenceIds.reduce(
          (count, occurrenceId) => count + (agendaTasksByOccurrence.get(occurrenceId)?.length ?? 0),
          0,
        )}
        profiles={assignableProfiles}
        columns={columns}
        statuses={taskStatuses}
        onSave={saveBulkTaskChanges}
      />
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialogTitle(deleteTarget)}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialogDescription(deleteTarget)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof AlertTriangle;
  tone: "destructive" | "warning" | "primary" | "success";
}) {
  const colors = {
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-2xl font-semibold leading-none">{value}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
      </span>
    </Card>
  );
}

function MeetingOverviewDialog({
  open,
  onOpenChange,
  occurrence,
  obligation,
  department,
  tasks,
  onCreateAgenda,
  onOpenTask,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: ObligationOccurrence | null;
  obligation: Obligation | null;
  department: ObligationDepartment | null;
  tasks: Task[];
  onCreateAgenda: () => void;
  onOpenTask: (task: Task) => void;
  onComplete: () => void;
}) {
  if (!occurrence || !obligation) return null;
  const completed = tasks.filter(
    (task) => task.status === "done" || Boolean(task.completed_at),
  ).length;
  const pending = tasks.length - completed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{obligation.title}</DialogTitle>
          <DialogDescription>
            {department?.name ?? "Sem departamento"} · {formatDate(occurrence.due_date)}
            {occurrence.due_time ? ` às ${occurrence.due_time.slice(0, 5)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Pautas</p>
            <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{pending}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{completed}</p>
          </Card>
        </div>

        {obligation.description ? (
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            {obligation.description}
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Pautas da reunião</h3>
              <p className="text-xs text-muted-foreground">
                Cada pauta é uma tarefa completa e pode possuir checklist ou subtarefas.
              </p>
            </div>
            <Button size="sm" onClick={onCreateAgenda}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova pauta
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card className="grid place-items-center px-4 py-10 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhuma pauta criada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione os assuntos que deverão ser tratados nesta reunião.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === "done" || Boolean(task.completed_at);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:bg-muted/40"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{task.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {isCompleted ? "Concluída" : "Pendente"}
                        {task.due_date
                          ? ` · prazo ${format(new Date(task.due_date), "dd/MM/yyyy")}`
                          : ""}
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button disabled={pending > 0} onClick={onComplete}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {pending > 0 ? `${pending} pauta(s) pendente(s)` : "Encerrar reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkTaskEditDialog({
  open,
  onOpenChange,
  taskCount,
  profiles,
  columns,
  statuses,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskCount: number;
  profiles: Profile[];
  columns: KanbanColumn[];
  statuses: TaskStatus[];
  onSave: (changes: BulkTaskChanges) => Promise<boolean>;
}) {
  const [applyTitle, setApplyTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [applyDescription, setApplyDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("unchanged");
  const [priority, setPriority] = useState("unchanged");
  const [status, setStatus] = useState("unchanged");
  const [applyCollaborators, setApplyCollaborators] = useState(false);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [applyDeadline, setApplyDeadline] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [dueDateReason, setDueDateReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApplyTitle(false);
    setTitle("");
    setApplyDescription(false);
    setDescription("");
    setAssignee("unchanged");
    setPriority("unchanged");
    setStatus("unchanged");
    setApplyCollaborators(false);
    setCollaboratorIds([]);
    setApplyDeadline(false);
    setDueDate("");
    setDueTime("");
    setDueDateReason("");
  }, [open]);

  const toggleCollaborator = (profileId: string) => {
    setCollaboratorIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId],
    );
  };

  const save = async () => {
    const updates: BulkTaskUpdates = {};
    if (applyTitle) {
      if (!title.trim()) {
        toast.error("Informe o novo título das tarefas.");
        return;
      }
      updates.title = title.trim();
    }
    if (applyDescription) updates.description = description.trim() || null;
    if (assignee !== "unchanged") {
      updates.assignee_id = assignee === "none" ? null : assignee;
    }
    if (priority !== "unchanged") {
      updates.priority = priority === "none" ? null : (priority as NonNullable<Task["priority"]>);
    }
    if (status !== "unchanged") {
      if (status === "completed") {
        updates.status = "done";
        updates.status_id = statuses.find((item) => item.is_completed)?.id ?? null;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.status = "todo";
        updates.status_id = statuses.find((item) => !item.is_completed)?.id ?? null;
        updates.completed_at = null;
        updates.column_id = status === "none" ? null : status.replace(/^column:/, "");
      }
    }
    if (applyDeadline) {
      if (!dueDateReason.trim()) {
        toast.error("Informe a justificativa para alterar os prazos.");
        return;
      }
      updates.due_date = dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null;
      updates.due_time = dueDate ? dueTime || null : null;
    }
    if (Object.keys(updates).length === 0 && !applyCollaborators) {
      toast.error("Escolha ao menos um campo para alterar.");
      return;
    }

    setSaving(true);
    try {
      if (
        await onSave({
          updates,
          collaboratorIds: applyCollaborators ? collaboratorIds : undefined,
          dueDateReason: applyDeadline ? dueDateReason.trim() : undefined,
        })
      ) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar tarefas selecionadas</DialogTitle>
          <DialogDescription>
            As alterações serão aplicadas a {taskCount} tarefa{taskCount === 1 ? "" : "s"}. Os
            vencimentos ainda previstos serão transformados em tarefas. Ative somente os campos que
            deseja substituir em todas elas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={applyTitle}
                  onCheckedChange={(checked) => setApplyTitle(checked === true)}
                  disabled={saving}
                />
                Alterar título
              </label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!applyTitle || saving}
                placeholder="Novo título para todas as tarefas"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assignee} onValueChange={setAssignee} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Não alterar</SelectItem>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || "Usuário"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Não alterar</SelectItem>
                  <SelectItem value="none">Sem prioridade</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Não alterar</SelectItem>
                  <SelectItem value="none">Sem coluna</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={`column:${column.id}`}>
                      {column.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={applyCollaborators}
                onCheckedChange={(checked) => setApplyCollaborators(checked === true)}
                disabled={saving}
              />
              Substituir participantes
            </label>
            <p className="text-xs text-muted-foreground">
              Ao ativar, a lista escolhida substituirá os participantes atuais de todas as tarefas.
            </p>
            {applyCollaborators && (
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={collaboratorIds.includes(profile.id)}
                      onCheckedChange={() => toggleCollaborator(profile.id)}
                      disabled={saving}
                    />
                    <span className="truncate">
                      {profile.full_name || profile.email || "Usuário"}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={applyDeadline}
                onCheckedChange={(checked) => setApplyDeadline(checked === true)}
                disabled={saving}
              />
              Alterar prazo e horário
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={!applyDeadline || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário opcional</Label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                  disabled={!applyDeadline || !dueDate || saving}
                />
              </div>
              {applyDeadline && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Justificativa da alteração <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={dueDateReason}
                    onChange={(event) => setDueDateReason(event.target.value)}
                    placeholder="Explique o motivo da alteração do prazo"
                    disabled={saving}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={applyDescription}
                onCheckedChange={(checked) => setApplyDescription(checked === true)}
                disabled={saving}
              />
              Alterar descrição
            </label>
            {applyDescription ? (
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Nova descrição para todas as tarefas..."
                minHeight={100}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                As descrições atuais serão preservadas.
              </p>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Aplicando..." : "Aplicar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentSection({
  department,
  subtitle,
  defaultOpen,
  actions,
  children,
}: {
  department: ObligationDepartment | null;
  subtitle: string;
  defaultOpen: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const departmentName = department?.name ?? "Sem departamento";
  const initials = departmentName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 transition hover:bg-muted/40">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Avatar className="h-11 w-11 shrink-0 rounded-xl border bg-background">
                <AvatarFallback
                  className="rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: department?.color || "#64748b" }}
                >
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{departmentName}</h2>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              {!actions && (
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              )}
            </button>
          </CollapsibleTrigger>
          {actions}
          {actions && (
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <CollapsibleContent>
          <div className="space-y-2 border-t bg-muted/15 p-3">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function OccurrenceRow({
  occurrence,
  obligation,
  department,
  agendaTasks,
  assignee,
  selected,
  working,
  onSelectedChange,
  onOpenMeeting,
  onComplete,
}: {
  occurrence: ObligationOccurrence;
  obligation: Obligation;
  department: ObligationDepartment | null;
  agendaTasks: Task[];
  assignee: Profile | null;
  selected: boolean;
  working: boolean;
  onSelectedChange: () => void;
  onOpenMeeting: () => void;
  onComplete: () => void;
}) {
  const today = todayKey();
  const overdue = occurrence.due_date < today;
  const dueToday = occurrence.due_date === today;
  const displayTitle = obligation.title;
  const completedAgendaCount = agendaTasks.filter(
    (agenda) => agenda.status === "done" || Boolean(agenda.completed_at),
  ).length;
  const hasPendingAgendas = completedAgendaCount < agendaTasks.length;
  const assigneeName = assignee?.full_name || assignee?.email || "Sem responsável";
  const initials = assignee
    ? assigneeName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";
  return (
    <Card
      className={`flex flex-wrap items-center gap-3 p-3 ${selected ? "ring-2 ring-primary/30" : ""} ${overdue ? "border-destructive/40" : dueToday ? "border-amber-500/50" : ""}`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onSelectedChange}
        aria-label={`Selecionar ${displayTitle} de ${formatDate(occurrence.due_date)}`}
      />
      <div
        className="grid h-12 w-14 shrink-0 place-items-center rounded-xl text-center text-white"
        style={{ backgroundColor: department?.color || "#64748b" }}
      >
        <span>
          <span className="block text-lg font-bold leading-none">
            {format(new Date(`${occurrence.due_date}T12:00:00`), "dd")}
          </span>
          <span className="text-[9px] font-semibold uppercase">
            {format(new Date(`${occurrence.due_date}T12:00:00`), "MMM", { locale: ptBR })}
          </span>
        </span>
      </div>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={assignee?.avatar_url || undefined} alt={assigneeName} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-[180px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{displayTitle}</h3>
          {overdue ? (
            <Badge variant="destructive">Atrasada</Badge>
          ) : dueToday ? (
            <Badge className="bg-amber-500 text-white">Hoje</Badge>
          ) : agendaTasks.length > 0 ? (
            <Badge variant="secondary">
              {completedAgendaCount}/{agendaTasks.length} pauta(s)
            </Badge>
          ) : (
            <Badge variant="outline">Sem pautas</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {department?.name || "Sem departamento"} · {assigneeName} ·{" "}
          {formatRecurrence(obligation)}
          {occurrence.due_time ? ` · ${occurrence.due_time.slice(0, 5)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={onOpenMeeting}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Abrir reunião
        </Button>
        <Button
          size="sm"
          disabled={working || hasPendingAgendas}
          onClick={onComplete}
          title={hasPendingAgendas ? "Conclua as pautas pendentes antes de encerrar" : undefined}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Encerrar
        </Button>
      </div>
    </Card>
  );
}

function ObligationsCalendar({
  cursor,
  onCursorChange,
  occurrences,
  obligationById,
  departmentById,
  onOccurrenceClick,
}: {
  cursor: Date;
  onCursorChange: (date: Date) => void;
  occurrences: ObligationOccurrence[];
  obligationById: Map<string, Obligation>;
  departmentById: Map<string, ObligationDepartment>;
  onOccurrenceClick: (occurrence: ObligationOccurrence) => void;
}) {
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      }),
    [cursor],
  );
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCursorChange(subMonths(cursor, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCursorChange(addMonths(cursor, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onCursorChange(new Date())}>
            Hoje
          </Button>
        </div>
        <h3 className="font-semibold capitalize">
          {format(cursor, "MMMM yyyy", { locale: ptBR })}
        </h3>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <div key={day} className="p-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = occurrences.filter((occurrence) =>
            isSameDay(new Date(`${occurrence.due_date}T12:00:00`), day),
          );
          return (
            <div
              key={day.toISOString()}
              className={`min-h-28 border-b border-r p-1.5 ${isSameMonth(day, cursor) ? "" : "bg-muted/20 text-muted-foreground"}`}
            >
              <span
                className={`inline-grid h-6 min-w-6 place-items-center rounded-full text-xs ${isSameDay(day, new Date()) ? "bg-primary font-semibold text-primary-foreground" : ""}`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {items.slice(0, 4).map((occurrence) => {
                  const obligation = obligationById.get(occurrence.obligation_id);
                  if (!obligation) return null;
                  const department = departmentById.get(obligation.department_id ?? "");
                  return (
                    <button
                      key={occurrence.id}
                      type="button"
                      onClick={() => onOccurrenceClick(occurrence)}
                      className="block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium text-white shadow-sm hover:brightness-105"
                      style={{ backgroundColor: department?.color || "#64748b" }}
                      title={obligation.title}
                    >
                      {obligation.title}
                    </button>
                  );
                })}
                {items.length > 4 ? (
                  <span className="block text-[10px] font-medium text-primary">
                    +{items.length - 4} mais
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="grid place-items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Settings2 className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

function formatDate(value: string) {
  return format(new Date(`${value.slice(0, 10)}T12:00:00`), "dd/MM/yyyy");
}

function formatRecurrence(obligation: Obligation) {
  if (obligation.frequency === "daily")
    return obligation.interval_count === 1
      ? obligation.business_days_only
        ? "Todos os dias úteis"
        : "Todos os dias"
      : `A cada ${obligation.interval_count} dias`;
  if (obligation.frequency === "weekly") {
    const labels = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
    return `${obligation.interval_count === 1 ? "Semanal" : `A cada ${obligation.interval_count} semanas`} · ${obligation.days_of_week.map((day) => labels[day]).join(", ")}`;
  }
  if (obligation.month_rule === "last_day")
    return obligation.interval_count === 1
      ? "Último dia do mês"
      : `Último dia a cada ${obligation.interval_count} meses`;
  if (obligation.month_rule === "last_business_day")
    return obligation.interval_count === 1
      ? "Último dia útil do mês"
      : `Último dia útil a cada ${obligation.interval_count} meses`;
  return `${obligation.interval_count === 1 ? "Mensal" : `A cada ${obligation.interval_count} meses`} · dia${obligation.days_of_month.length > 1 ? "s" : ""} ${obligation.days_of_month.join(" e ")}`;
}

function deleteDialogTitle(target: DeleteTarget | null) {
  if (target?.scope === "occurrences") return "Excluir os vencimentos selecionados?";
  if (target?.scope === "series") return "Excluir toda esta obrigação?";
  if (target?.scope === "series-batch") {
    return target.obligations.length === 1
      ? "Excluir a obrigação inteira?"
      : "Excluir as obrigações inteiras?";
  }
  if (target?.scope === "all") return "Excluir todas as obrigações?";
  return "Excluir obrigação?";
}

function deleteDialogDescription(target: DeleteTarget | null) {
  if (target?.scope === "occurrences") {
    return `${target.occurrences.length} vencimento(s) selecionado(s) serão removidos. Os demais vencimentos das séries continuarão normalmente.`;
  }
  if (target?.scope === "series") {
    return `A obrigação “${target.obligation.title}” e todos os vencimentos dela serão excluídos. Tarefas que já foram geradas serão preservadas.`;
  }
  if (target?.scope === "series-batch") {
    return target.obligations.length === 1
      ? `A obrigação “${target.obligations[0].title}” e todos os vencimentos dela serão excluídos. Tarefas que já foram geradas serão preservadas.`
      : `${target.obligations.length} obrigações envolvidas na seleção e todos os vencimentos delas serão excluídos. Tarefas que já foram geradas serão preservadas.`;
  }
  return "Todas as obrigações e seus vencimentos serão excluídos deste ambiente. Tarefas que já foram geradas serão preservadas.";
}
