/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase types are regenerated after the migration is applied. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAssignableProfiles, useColumns, useTaskStatuses } from "@/hooks/use-data";
import {
  useObligationDepartments,
  useObligationTaskTemplates,
  type Obligation,
  type ObligationFrequency,
  type ObligationMonthRule,
} from "@/hooks/use-obligations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { enqueueOfflineOperation, isOffline } from "@/lib/offline-sync";

interface ObligationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligation?: Obligation | null;
}

const weekDays = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 7, label: "Dom" },
];

const todayValue = () => new Date().toISOString().slice(0, 10);

/** Pauta padrão em edição no formulário; `id` existe apenas para as já salvas. */
type AgendaDraft = { key: string; id?: string; title: string; assigneeId: string };

export function ObligationDialog({ open, onOpenChange, obligation }: ObligationDialogProps) {
  const queryClient = useQueryClient();
  const { user, activeWorkspace } = useAuth();
  const { data: profiles = [] } = useAssignableProfiles();
  const { data: columns = [] } = useColumns();
  const { data: statuses = [] } = useTaskStatuses();
  const { data: departments = [] } = useObligationDepartments();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [agendaItems, setAgendaItems] = useState<AgendaDraft[]>([]);
  const [focusAgendaKey, setFocusAgendaKey] = useState<string | null>(null);
  const agendaLoadedFor = useRef<string | null>(null);
  const { data: savedTemplates } = useObligationTaskTemplates(open ? obligation?.id : null);
  const [assigneeId, setAssigneeId] = useState("");
  const [frequency, setFrequency] = useState<ObligationFrequency>("monthly");
  const [intervalCount, setIntervalCount] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [monthRule, setMonthRule] = useState<ObligationMonthRule>("specific_days");
  const [daysOfMonth, setDaysOfMonth] = useState("30");
  const [businessDaysOnly, setBusinessDaysOnly] = useState(false);
  const [startDate, setStartDate] = useState(todayValue());
  const [endDate, setEndDate] = useState("");
  const [createBeforeDays, setCreateBeforeDays] = useState(7);
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Obligation["priority"]>("medium");
  const [columnId, setColumnId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(obligation?.title ?? "");
    setDescription(obligation?.description ?? "");
    setDepartmentId(obligation?.department_id ?? "");
    setNewDepartmentName("");
    setAssigneeId(obligation?.assignee_id ?? "");
    setFrequency(obligation?.frequency ?? "monthly");
    setIntervalCount(obligation?.interval_count ?? 1);
    setDaysOfWeek(obligation?.days_of_week?.length ? obligation.days_of_week : [1]);
    setMonthRule(obligation?.month_rule ?? "specific_days");
    setDaysOfMonth(obligation?.days_of_month?.length ? obligation.days_of_month.join(", ") : "30");
    setBusinessDaysOnly(obligation?.business_days_only ?? false);
    setStartDate(obligation?.start_date ?? todayValue());
    setEndDate(obligation?.end_date ?? "");
    setCreateBeforeDays(obligation?.create_before_days ?? 7);
    setDueTime(obligation?.due_time?.slice(0, 5) ?? "");
    setPriority(obligation?.priority ?? "medium");
    setColumnId(obligation?.column_id ?? "");
    setStatusId(obligation?.status_id ?? "");
    setIsActive(obligation?.is_active ?? true);
    setAgendaItems([]);
    setFocusAgendaKey(null);
    agendaLoadedFor.current = null;
  }, [open, obligation]);

  // Carrega as pautas salvas uma única vez por abertura, sem sobrescrever edições.
  useEffect(() => {
    if (!open || !obligation || !savedTemplates) return;
    if (agendaLoadedFor.current === obligation.id) return;
    agendaLoadedFor.current = obligation.id;
    // As salvas vêm antes de qualquer tarefa já digitada enquanto carregavam.
    setAgendaItems((current) => [
      ...savedTemplates.map((template) => ({
        key: template.id,
        id: template.id,
        title: template.title,
        assigneeId: template.assignee_id ?? "",
      })),
      ...current,
    ]);
  }, [open, obligation, savedTemplates]);

  const addAgendaItem = () => {
    const key = crypto.randomUUID();
    setAgendaItems((current) => [...current, { key, title: "", assigneeId: "" }]);
    setFocusAgendaKey(key);
  };

  const updateAgendaItem = (key: string, patch: Partial<AgendaDraft>) => {
    setAgendaItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeAgendaItem = (key: string) => {
    setAgendaItems((current) => current.filter((item) => item.key !== key));
  };

  /** Linhas a gravar em obligation_task_templates, na ordem da lista. */
  const agendaRowsFor = (obligationId: string, reuseIds: boolean) =>
    agendaItems
      .filter((item) => item.title.trim())
      .map((item, position) => ({
        id: reuseIds && item.id ? item.id : crypto.randomUUID(),
        obligation_id: obligationId,
        title: item.title.trim(),
        assignee_id: item.assigneeId || null,
        position,
      }));

  const removedTemplateIds = () => {
    const keptIds = new Set(agendaItems.filter((item) => item.title.trim()).map((item) => item.id));
    return (savedTemplates ?? [])
      .map((template) => template.id)
      .filter((id) => !keptIds.has(id));
  };

  const saveAgendaTemplates = async (obligationIds: string[]) => {
    const removed = obligation ? removedTemplateIds() : [];
    if (removed.length > 0) {
      const { error } = await (supabase.from("obligation_task_templates" as any) as any)
        .delete()
        .in("id", removed);
      if (error) return error;
    }
    const rows = obligationIds.flatMap((id) => agendaRowsFor(id, Boolean(obligation)));
    if (rows.length === 0) return null;
    const { error } = await (supabase.from("obligation_task_templates" as any) as any).upsert(rows, {
      onConflict: "id",
    });
    return error;
  };

  const parsedMonthDays = useMemo(
    () =>
      [
        ...new Set(
          daysOfMonth
            .split(/[,;\s]+/)
            .map(Number)
            .filter((day) => day >= 1 && day <= 31),
        ),
      ].sort((a, b) => a - b),
    [daysOfMonth],
  );

  const recurrencePreview = useMemo(() => {
    const every = intervalCount > 1 ? `A cada ${intervalCount}` : "Todo";
    if (frequency === "daily") {
      return intervalCount === 1
        ? businessDaysOnly
          ? "Todos os dias úteis"
          : "Todos os dias"
        : `${every} dias${businessDaysOnly ? " úteis" : ""}`;
    }
    if (frequency === "weekly") {
      const selected = weekDays
        .filter((day) => daysOfWeek.includes(day.value))
        .map((day) => day.label);
      return `${intervalCount === 1 ? "Toda semana" : `${every} semanas`}: ${selected.join(", ") || "selecione os dias"}`;
    }
    if (monthRule === "last_day")
      return intervalCount === 1
        ? "Último dia de cada mês"
        : `Último dia a cada ${intervalCount} meses`;
    if (monthRule === "last_business_day")
      return intervalCount === 1
        ? "Último dia útil de cada mês"
        : `Último dia útil a cada ${intervalCount} meses`;
    return `${intervalCount === 1 ? "Todo mês" : `${every} meses`}: dia${parsedMonthDays.length > 1 ? "s" : ""} ${parsedMonthDays.join(" e ") || "—"}`;
  }, [businessDaysOnly, daysOfWeek, frequency, intervalCount, monthRule, parsedMonthDays]);

  const departmentSearchTerm = departmentSearch.trim();
  const normalizedDepartmentSearch = departmentSearchTerm.toLocaleLowerCase("pt-BR");
  const filteredDepartments = departments.filter((department) =>
    department.name.toLocaleLowerCase("pt-BR").includes(normalizedDepartmentSearch),
  );
  const exactDepartment = departments.find(
    (department) => department.name.toLocaleLowerCase("pt-BR") === normalizedDepartmentSearch,
  );
  const selectedDepartmentName =
    departments.find((department) => department.id === departmentId)?.name ?? newDepartmentName;

  const chooseDepartment = (id: string) => {
    setDepartmentId(id);
    setNewDepartmentName("");
    setDepartmentOpen(false);
  };

  // O departamento só é gravado ao salvar a obrigação, junto com ela.
  const createDepartmentOption = () => {
    setDepartmentId("");
    setNewDepartmentName(departmentSearchTerm);
    setDepartmentOpen(false);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o nome da obrigação.");
    if (!departmentId && !newDepartmentName.trim())
      return toast.error("Selecione ou crie um departamento.");
    if (!startDate) return toast.error("Informe a data de início.");
    if (frequency === "weekly" && daysOfWeek.length === 0)
      return toast.error("Selecione ao menos um dia da semana.");
    if (frequency === "monthly" && monthRule === "specific_days" && parsedMonthDays.length === 0)
      return toast.error("Informe ao menos um dia válido do mês.");
    if (endDate && endDate < startDate)
      return toast.error("A data final não pode ser anterior ao início.");

    setSaving(true);
    let resolvedDepartmentId = departmentId;
    if (!resolvedDepartmentId && newDepartmentName.trim()) {
      if (isOffline()) {
        setSaving(false);
        return toast.error("Conecte-se à internet para criar um novo departamento.");
      }
      const existingDepartment = departments.find(
        (department) =>
          department.name.toLocaleLowerCase("pt-BR") ===
          newDepartmentName.trim().toLocaleLowerCase("pt-BR"),
      );
      if (existingDepartment) {
        resolvedDepartmentId = existingDepartment.id;
      } else {
        const { data: createdDepartment, error: departmentError } = await (
          supabase.from("obligation_departments" as any) as any
        )
          .insert({
            name: newDepartmentName.trim(),
            workspace_id: activeWorkspace?.id,
            created_by: user?.id,
          })
          .select("id")
          .single();
        if (departmentError || !createdDepartment) {
          setSaving(false);
          return toast.error(departmentError?.message ?? "Não foi possível criar o departamento.");
        }
        resolvedDepartmentId = createdDepartment.id;
      }
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      assignee_id: assigneeId || null,
      frequency,
      interval_count: Math.max(1, intervalCount),
      days_of_week: frequency === "weekly" ? daysOfWeek : [],
      days_of_month:
        frequency === "monthly" && monthRule === "specific_days" ? parsedMonthDays : [],
      month_rule: frequency === "monthly" ? monthRule : "specific_days",
      business_days_only: frequency === "daily" && businessDaysOnly,
      start_date: startDate,
      end_date: endDate || null,
      create_before_days: Math.max(0, createBeforeDays),
      due_time: dueTime || null,
      priority,
      column_id: columnId || null,
      status_id: statusId || null,
      department_id: resolvedDepartmentId,
      meeting_mode: true,
      is_active: isActive,
    };

    if (user && activeWorkspace && isOffline()) {
      const now = new Date().toISOString();
      const localItems: Obligation[] = obligation
        ? [{ ...obligation, ...payload, updated_at: now }]
        : [
            {
              id: crypto.randomUUID(),
              workspace_id: activeWorkspace.id,
              created_by: user.id,
              created_at: now,
              updated_at: now,
              client_id: null,
              ...payload,
            },
          ];
      await Promise.all(
        localItems.map((item) =>
          enqueueOfflineOperation({
            userId: user.id,
            entity: "record",
            action: obligation ? "update" : "create",
            entityId: item.id,
            payload: obligation
              ? { table: "obligations", patch: payload }
              : { table: "obligations", record: item },
          }),
        ),
      );
      // Depois das obrigações: a fila só envia a pauta quando a obrigação existir.
      for (const removedId of obligation ? removedTemplateIds() : []) {
        await enqueueOfflineOperation({
          userId: user.id,
          entity: "record",
          action: "delete",
          entityId: removedId,
          payload: { table: "obligation_task_templates" },
        });
      }
      for (const row of localItems.flatMap((item) => agendaRowsFor(item.id, Boolean(obligation)))) {
        await enqueueOfflineOperation({
          userId: user.id,
          entity: "record",
          action: "create",
          entityId: row.id,
          payload: { table: "obligation_task_templates", record: row, upsert: true },
        });
      }
      queryClient.setQueryData<Obligation[]>(["obligations", activeWorkspace.id], (current = []) =>
        obligation
          ? current.map((item) => (item.id === obligation.id ? localItems[0] : item))
          : [...current, ...localItems],
      );
      setSaving(false);
      toast.success(
        "Obrigação salva neste aparelho. Os próximos prazos serão gerados ao reconectar.",
      );
      onOpenChange(false);
      return;
    }

    const request = obligation
      ? (supabase.from("obligations" as any) as any)
          .update(payload)
          .eq("id", obligation.id)
          .select("id")
      : (supabase.from("obligations" as any) as any)
          .insert(payload)
          .select("id");
    const { data, error } = await request;
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    const savedObligations = (data ?? []) as Array<{ id: string }>;
    // As pautas precisam existir antes de gerar as reuniões, que já nascem com elas.
    const agendaError = await saveAgendaTemplates(savedObligations.map(({ id }) => id));
    const refreshResults = await Promise.all(
      savedObligations.map(({ id }) =>
        (supabase as any).rpc("refresh_obligation", { target_obligation_id: id }),
      ),
    );
    const refreshError = refreshResults.find((result) => result.error)?.error;
    setSaving(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["obligations"] }),
      queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
      queryClient.invalidateQueries({ queryKey: ["obligation-task-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    ]);
    if (agendaError) {
      toast.error(`Obrigação salva, mas as tarefas das reuniões não foram salvas: ${agendaError.message}`);
      return;
    }
    if (refreshError) {
      toast.error(
        `Obrigação salva, mas alguns próximos prazos não foram gerados: ${refreshError.message}`,
      );
      return;
    }
    toast.success(obligation ? "Obrigação atualizada" : "Obrigação criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{obligation ? "Editar obrigação" : "Nova obrigação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obligation-title">Nome da reunião *</Label>
              <Input
                id="obligation-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Reunião semanal do Financeiro"
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Popover
                  open={departmentOpen}
                  onOpenChange={(open) => {
                    setDepartmentOpen(open);
                    if (open) setDepartmentSearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {selectedDepartmentName ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{selectedDepartmentName}</span>
                          {!departmentId && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              novo
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="truncate text-muted-foreground">
                          Selecione ou crie um departamento
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-2"
                  >
                    <Input
                      value={departmentSearch}
                      onChange={(event) => setDepartmentSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (exactDepartment) chooseDepartment(exactDepartment.id);
                        else if (departmentSearchTerm) createDepartmentOption();
                        else if (filteredDepartments.length === 1)
                          chooseDepartment(filteredDepartments[0].id);
                      }}
                      placeholder="Buscar ou digitar um novo departamento..."
                      className="mb-2 h-8"
                      autoFocus
                    />
                    <div className="max-h-56 overflow-y-auto">
                      {newDepartmentName && !departmentSearchTerm && (
                        <DepartmentOption selected label={newDepartmentName} tag="novo" />
                      )}
                      {filteredDepartments.map((department) => (
                        <DepartmentOption
                          key={department.id}
                          label={department.name}
                          selected={department.id === departmentId}
                          onSelect={() => chooseDepartment(department.id)}
                        />
                      ))}
                      {departmentSearchTerm && !exactDepartment && (
                        <button
                          type="button"
                          onClick={createDepartmentOption}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-primary hover:bg-accent"
                        >
                          <Plus className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            Criar departamento “{departmentSearchTerm}”
                          </span>
                        </button>
                      )}
                      {!departmentSearchTerm && departments.length === 0 && !newDepartmentName && (
                        <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                          Nenhum departamento ainda. Digite um nome para criar o primeiro.
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={assigneeId || "none"}
                  onValueChange={(value) => setAssigneeId(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obligation-description">Descrição e orientações</Label>
              <Textarea
                id="obligation-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Documentos necessários, forma de entrega, conferências..."
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">Tarefas de cada reunião</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Toda reunião gerada já nasce com estas tarefas. Você ainda pode incluir pautas
                  extras em cada reunião.
                </p>
              </div>
              {agendaItems.length > 0 && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {agendaItems.length} {agendaItems.length === 1 ? "tarefa" : "tarefas"}
                </span>
              )}
            </div>
            {agendaItems.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhuma tarefa padrão. As pautas serão criadas manualmente em cada reunião.
              </p>
            ) : (
              <ol className="space-y-2">
                {agendaItems.map((item, index) => (
                  <li key={item.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="hidden w-6 shrink-0 text-right text-sm text-muted-foreground sm:block">
                      {index + 1}.
                    </span>
                    <Input
                      value={item.title}
                      onChange={(event) => updateAgendaItem(item.key, { title: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        if (item.title.trim()) addAgendaItem();
                      }}
                      placeholder="Ex.: Conferir folha de pagamento"
                      aria-label={`Tarefa ${index + 1}`}
                      autoFocus={item.key === focusAgendaKey}
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Select
                        value={item.assigneeId || "default"}
                        onValueChange={(value) =>
                          updateAgendaItem(item.key, { assigneeId: value === "default" ? "" : value })
                        }
                      >
                        <SelectTrigger className="sm:w-52" aria-label={`Responsável da tarefa ${index + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Responsável da reunião</SelectItem>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAgendaItem(item.key)}
                        aria-label={`Remover tarefa ${index + 1}`}
                        title="Remover tarefa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={addAgendaItem}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar tarefa
            </Button>
          </section>

          <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div>
              <h3 className="font-medium">Recorrência</h3>
              <p className="mt-1 text-xs text-muted-foreground">{recurrencePreview}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) => setFrequency(value as ObligationFrequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="obligation-interval">A cada</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="obligation-interval"
                    type="number"
                    min={1}
                    max={365}
                    value={intervalCount}
                    onChange={(event) =>
                      setIntervalCount(Math.max(1, Number(event.target.value) || 1))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {frequency === "daily"
                      ? "dia(s)"
                      : frequency === "weekly"
                        ? "semana(s)"
                        : "mês(es)"}
                  </span>
                </div>
              </div>
            </div>

            {frequency === "daily" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={businessDaysOnly}
                  onCheckedChange={(value) => setBusinessDaysOnly(value === true)}
                />
                Somente dias úteis
              </label>
            )}

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => {
                    const selected = daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setDaysOfWeek(
                            selected
                              ? daysOfWeek.filter((value) => value !== day.value)
                              : [...daysOfWeek, day.value].sort(),
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {frequency === "monthly" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Regra mensal</Label>
                  <Select
                    value={monthRule}
                    onValueChange={(value) => setMonthRule(value as ObligationMonthRule)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific_days">Dia(s) específico(s)</SelectItem>
                      <SelectItem value="last_day">Último dia do mês</SelectItem>
                      <SelectItem value="last_business_day">Último dia útil do mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {monthRule === "specific_days" && (
                  <div className="space-y-2">
                    <Label htmlFor="obligation-month-days">Dias do mês</Label>
                    <Input
                      id="obligation-month-days"
                      value={daysOfMonth}
                      onChange={(event) => setDaysOfMonth(event.target.value)}
                      placeholder="Ex.: 15, 30"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Separe por vírgulas. Se o dia não existir, será usado o último dia do mês.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="obligation-start">Início</Label>
                <Input
                  id="obligation-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obligation-end">Término opcional</Label>
                <Input
                  id="obligation-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obligation-before">Criar tarefa antes</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="obligation-before"
                    type="number"
                    min={0}
                    max={365}
                    value={createBeforeDays}
                    onChange={(event) =>
                      setCreateBeforeDays(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                  <span className="text-xs text-muted-foreground">dias</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="obligation-time">Horário opcional</Label>
                <Input
                  id="obligation-time"
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Prioridade da tarefa</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Obligation["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coluna inicial</Label>
              <Select
                value={columnId || "auto"}
                onValueChange={(value) => setColumnId(value === "auto" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Primeira coluna</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status inicial</Label>
              <Select
                value={statusId || "auto"}
                onValueChange={(value) => setStatusId(value === "auto" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Primeiro status aberto</SelectItem>
                  {statuses
                    .filter((status) => !status.is_completed)
                    .map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <Checkbox
                checked={isActive}
                onCheckedChange={(value) => setIsActive(value === true)}
              />
              Obrigação ativa
            </label>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : "Salvar obrigação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentOption({
  label,
  selected,
  tag,
  onSelect,
}: {
  label: string;
  selected: boolean;
  tag?: string;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
        selected && "bg-accent/60 font-medium",
      )}
    >
      <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <span className="truncate">{label}</span>
      {tag && (
        <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {tag}
        </span>
      )}
    </button>
  );
}
