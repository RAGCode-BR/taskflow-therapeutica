import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles, useTaskStatuses } from "@/hooks/use-data";
import { useWorkspaceTasks } from "@/hooks/use-workspace-tasks";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  ListTodo,
  AlertTriangle,
  Clock,
  ShieldCheck,
  User as UserIcon,
  ListChecks,
  Flame,
  Trophy,
  Crown,
  Activity,
  CalendarRange,
  RotateCcw,
  TrendingUp,
  UsersRound,
  Gauge,
  ArrowDownUp,
  TicketCheck,
  Timer,
  Sparkles,
  Target,
} from "lucide-react";
import {
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

function Kpi({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Clock;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div
          className="grid h-10 w-10 place-items-center rounded-lg"
          style={{ background: `${color}20`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

type DueDateChangeReport = {
  id: string;
  task_id: string;
  old_due_date: string | null;
  new_due_date: string | null;
  reason: string | null;
  created_at: string;
};

type ServiceRequestReport = {
  id: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  created_at: string;
  resolved_at: string | null;
};

const currentMonthPeriod = () => {
  const today = new Date();
  return {
    start: format(startOfMonth(today), "yyyy-MM-dd"),
    end: format(endOfMonth(today), "yyyy-MM-dd"),
  };
};

const previousMonthPeriod = () => {
  const previousMonth = subMonths(new Date(), 1);
  return {
    start: format(startOfMonth(previousMonth), "yyyy-MM-dd"),
    end: format(endOfMonth(previousMonth), "yyyy-MM-dd"),
  };
};

const dateIsInPeriod = (value: string | null | undefined, start: Date, end: Date) =>
  Boolean(value && isWithinInterval(parseISO(value), { start, end }));

const formatReportDate = (value: string | null | undefined) =>
  value ? format(parseISO(value), "dd/MM/yyyy", { locale: ptBR }) : "Sem prazo";

const completedAfterDueDate = (
  completedAt: string | null | undefined,
  dueDate: string | null | undefined,
) => Boolean(completedAt && dueDate && isAfter(parseISO(completedAt), endOfDay(parseISO(dueDate))));

function TeamRankingPanel({
  members,
  onViewLateTasks,
}: {
  members: any[];
  onViewLateTasks: (member: any) => void;
}) {
  const ranked = members
    .filter((member) => member.done > 0 || member.lateCount > 0)
    .sort((a, b) => {
      return (
        b.deliveryBalance - a.deliveryBalance ||
        b.onTime - a.onTime ||
        b.done - a.done ||
        a.lateCount - b.lateCount ||
        a.fullName.localeCompare(b.fullName, "pt-BR")
      );
    });
  const maxOnTime = Math.max(...ranked.map((member) => member.onTime), 1);
  const podiumColors = ["#f59e0b", "#94a3b8", "#b87333"];
  const podiumBackgrounds = [
    "border-amber-300 bg-amber-50/80 dark:bg-amber-950/15",
    "border-slate-300 bg-slate-50/70 dark:bg-slate-900/25",
    "border-orange-300 bg-orange-50/70 dark:bg-orange-950/15",
  ];

  if (!ranked.length)
    return (
      <Card className="p-5 text-sm text-muted-foreground">Nenhum colaborador no filtro atual.</Card>
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.6fr)]">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-5">
          <Crown className="h-5 w-5 text-[#f59e0b]" />
          <h2 className="text-xl font-semibold">Pódio da performance</h2>
        </div>
        <div className="space-y-3 p-4">
          {ranked.slice(0, 3).map((member, index) => {
            const Medal = index === 0 ? Crown : Trophy;
            return (
              <div
                key={member.id}
                className={`rounded-[1.35rem] border p-5 ${podiumBackgrounds[index]}`}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                    <AvatarImage src={member.avatarUrl || undefined} alt={member.fullName} />
                    <AvatarFallback className="text-lg">
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Medal className="h-5 w-5" style={{ color: podiumColors[index] }} />
                      {index + 1}º lugar
                    </p>
                    <p className="truncate text-xl font-bold">{member.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.done} entregas · {member.onTime} no prazo · {member.lateCount} fora do
                      prazo
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums">{member.done}</p>
                    <p className="text-sm text-muted-foreground">entregas</p>
                  </div>
                </div>
                <div className="mt-4 border-t pt-4 text-sm leading-6">
                  <p className="text-emerald-600">
                    <span className="font-semibold">Por que está no pódio:</span> {member.done}{" "}
                    entregas concluídas, com {member.onTime} entregue(s) no prazo.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-semibold">Ponto a evoluir:</span>{" "}
                    {member.lateCount ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onViewLateTasks(member)}
                          className="font-medium underline decoration-dotted underline-offset-4 hover:text-foreground"
                        >
                          {member.lateCount} tarefa(s) fora do prazo
                        </button>{" "}
                        descontam posição.
                      </>
                    ) : (
                      "manter as entregas no prazo."
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-5">
          <Activity className="h-5 w-5 text-[#5d6e3e]" />
          <div>
            <h2 className="text-xl font-semibold">Ranking completo — equipe</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Entregas no prazo e concluídas fazem subir; cada item fora do prazo desconta posição.
            </p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {ranked.map((member, index) => {
            return (
              <div key={member.id} className="rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar className="h-12 w-12 border shadow-sm">
                    <AvatarImage src={member.avatarUrl || undefined} alt={member.fullName} />
                    <AvatarFallback>{member.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">{member.fullName}</p>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-bold tabular-nums">
                        {member.done} entregas
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Entregas concluídas no prazo</span>
                      <span className="tabular-nums">{member.onTime}</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#5d6e3e]"
                        style={{ width: `${(member.onTime / maxOnTime) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="text-emerald-600">{member.done} concluídas</span> ·{" "}
                      <span>{member.onTime} no prazo</span> ·{" "}
                      {member.lateCount ? (
                        <button
                          type="button"
                          onClick={() => onViewLateTasks(member)}
                          className="underline decoration-dotted underline-offset-4 hover:text-foreground"
                        >
                          {member.lateCount} fora do prazo
                        </button>
                      ) : (
                        "0 fora do prazo"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function LateTasksDialog({
  member,
  open,
  onOpenChange,
}: {
  member: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lateTasks = member?.lateTasks ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cards fora do prazo — {member?.fullName}</DialogTitle>
          <DialogDescription>
            O prazo final é sempre o vigente no card. Alterações justificadas aparecem abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {lateTasks.map((task: any) => (
            <article key={task.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{task.title}</p>
                <Badge variant="outline">{task.kind}</Badge>
              </div>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <p>
                  Prazo final:{" "}
                  <span className="font-medium text-foreground">{task.dueDateLabel}</span>
                </p>
                <p>
                  {task.completedAtLabel ? (
                    <>
                      Concluída:{" "}
                      <span className="font-medium text-foreground">{task.completedAtLabel}</span>
                    </>
                  ) : (
                    "Ainda em aberto"
                  )}
                </p>
              </div>
              {task.deadlineChange && (
                <div className="mt-3 rounded-xl bg-muted/70 p-3 text-sm">
                  <p className="font-medium">Prazo reprogramado</p>
                  <p className="mt-1 text-muted-foreground">
                    {task.deadlineChange.oldDueDateLabel} → {task.deadlineChange.newDueDateLabel}
                  </p>
                  {task.deadlineChange.reason && (
                    <p className="mt-1 text-muted-foreground">
                      Justificativa: {task.deadlineChange.reason}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MonthlyBriefingPanel({
  periodLabel,
  totals,
  created,
  previousCompleted,
  team,
  peopleWithoutDeadline,
}: {
  periodLabel: string;
  totals: { done: number; pending: number; overdue: number };
  created: number;
  previousCompleted: number;
  team: any[];
  peopleWithoutDeadline: Array<{ id: string; name: string; tasks: any[] }>;
}) {
  const topDelivery = [...team].sort((a, b) => b.done - a.done)[0];
  const highestLoad = [...team].sort((a, b) => b.pending - a.pending)[0];
  const change = totals.done - previousCompleted;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(93,110,62,0.12),rgba(255,253,250,0.9)_55%,rgba(236,100,63,0.08))] p-6 dark:bg-[linear-gradient(135deg,rgba(167,183,124,0.18),rgba(25,27,23,0.9)_55%,rgba(240,122,85,0.12))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <Badge className="mb-3 bg-[#5d6e3e] hover:bg-[#5d6e3e]">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Briefing executivo
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">
              Leitura da operação — {periodLabel}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Foram concluídas <strong className="text-foreground">{totals.done} entregas</strong> e
              criadas {created} novas tarefas.{" "}
              {change === 0
                ? "O volume de entregas ficou estável em relação ao período anterior."
                : change > 0
                  ? `Isso representa ${change} entrega(s) a mais que no período anterior.`
                  : `Isso representa ${Math.abs(change)} entrega(s) a menos que no período anterior.`}{" "}
              {totals.overdue
                ? `Há ${totals.overdue} tarefa(s) atrasada(s) que exigem atenção imediata.`
                : "Não há tarefas atrasadas no recorte atual."}
            </p>
          </div>
          <div className="rounded-2xl border border-[#5d6e3e]/20 bg-background/70 px-5 py-4 text-right shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Foco imediato
            </p>
            <p className="mt-1 text-3xl font-bold text-[#5d6e3e]">
              {totals.overdue +
                peopleWithoutDeadline.reduce((sum, person) => sum + person.tasks.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">pontos de atenção</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Equipe
          </p>
          {topDelivery ? (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Maior volume de entregas:</span>
                <br />
                <strong className="text-base">{topDelivery.fullName}</strong> · {topDelivery.done}{" "}
                concluída(s).
              </p>
              <p>
                <span className="text-muted-foreground">Maior carga aberta:</span>
                <br />
                <strong className="text-base">{highestLoad?.fullName}</strong> ·{" "}
                {highestLoad?.pending ?? 0} pendente(s).
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Ainda não há dados de equipe no período.
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-rose-600" /> Próximas ações
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {totals.overdue ? <li>Priorizar as {totals.overdue} tarefa(s) atrasada(s).</li> : null}
            {peopleWithoutDeadline.length ? (
              <li>
                Definir prazo com {peopleWithoutDeadline.length} pessoa(s) que têm tarefas sem data.
              </li>
            ) : null}
            {highestLoad?.pending ? <li>Revisar a carga de {highestLoad.fullName}.</li> : null}
            {!totals.overdue && !peopleWithoutDeadline.length ? (
              <li>Manter a cadência e acompanhar as {totals.pending} pendência(s) abertas.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <UsersRound className="h-5 w-5 text-[#5d6e3e]" /> Leitura por consultor
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Quem entregou, onde existe acúmulo e qual é o principal ponto de atenção de cada
              pessoa.
            </p>
          </div>
          <Badge variant="outline">{team.length} consultor(es) no período</Badge>
        </div>
        {team.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {team.map((person) => {
              const withoutDeadline =
                peopleWithoutDeadline.find((item) => item.id === person.id)?.tasks.length ?? 0;
              const attention = person.overdue
                ? `${person.overdue} tarefa(s) atrasada(s)`
                : withoutDeadline
                  ? `${withoutDeadline} tarefa(s) sem prazo`
                  : person.pending
                    ? `${person.pending} tarefa(s) em aberto`
                    : "Nenhum risco imediato";
              return (
                <Card key={person.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{person.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {person.isAdmin ? "Administrador" : "Consultor"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#5d6e3e]/10 px-2.5 py-1 text-sm font-bold text-[#5d6e3e]">
                      {person.onTimeRate}% no prazo
                    </span>
                  </div>
                  <div className="grid grid-cols-3 divide-x text-center">
                    <div className="p-3">
                      <p className="text-xl font-bold text-emerald-600">{person.done}</p>
                      <p className="text-[11px] text-muted-foreground">entregas</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xl font-bold text-amber-600">{person.pending}</p>
                      <p className="text-[11px] text-muted-foreground">abertas</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xl font-bold text-rose-600">{person.overdue}</p>
                      <p className="text-[11px] text-muted-foreground">atrasadas</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 px-5 py-3 text-sm">
                    <span className="font-medium">Leitura:</span>{" "}
                    <span
                      className={
                        person.overdue || withoutDeadline
                          ? "text-rose-700"
                          : "text-muted-foreground"
                      }
                    >
                      {attention}.
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            Não há dados de consultores neste período.
          </Card>
        )}
      </section>

      <p className="px-1 text-xs text-muted-foreground">
        Prévia do briefing automático mensal. No fechamento, a IA usará essas métricas para produzir
        uma análise editorial salva do período.
      </p>
    </div>
  );
}

function ReportsPage() {
  const { isAdmin, hasPermission, loading, activeWorkspace } = useAuth();
  const { data: tasks = [] } = useWorkspaceTasks();
  const { data: profiles = [] } = useProfiles();
  const { data: statuses = [] } = useTaskStatuses();
  const { data: subtasks = [] } = useQuery({
    queryKey: ["subtasks_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subtasks").select("id, task_id, done");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });
  const { data: dueDateChanges = [] } = useQuery({
    queryKey: ["task_due_date_changes_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_due_date_changes")
        .select("id, task_id, old_due_date, new_due_date, reason, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DueDateChangeReport[];
    },
  });
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["service_requests_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id, status, priority, due_date, created_at, resolved_at");
      if (error) throw error;
      return (data ?? []) as ServiceRequestReport[];
    },
  });
  // Quem pertence ao ambiente ativo. As tarefas já vêm recortadas por ambiente
  // (useWorkspaceTasks), mas a lista de pessoas vinha de `profiles` inteira e
  // trazia gente de outro ambiente para os filtros, gráficos e rankings.
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ["reports_workspace_members", activeWorkspace?.id],
    enabled: !!activeWorkspace?.id,
    queryFn: async () =>
      ((
        await (supabase.rpc("list_workspace_member_ids", {
          target_workspace_id: activeWorkspace!.id,
        }) as any)
      ).data ?? []) as Array<{ user_id: string }>,
  });

  const [period, setPeriod] = useState(previousMonthPeriod);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [reportView, setReportView] = useState<"briefing" | "summary" | "operations" | "team">(
    "briefing",
  );
  const [lateTasksMember, setLateTasksMember] = useState<any | null>(null);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!hasPermission("reports")) return <Navigate to="/mural" />;

  const matchesStatus = (p: any) => {
    const active = p.is_active !== false;
    return statusFilter === "all" || (statusFilter === "active" ? active : !active);
  };
  // Contas legadas com a categoria "client" (portal descontinuado) não são
  // colaboradores e ficam fora dos filtros, gráficos e tabelas de usuários.
  const clientUserIds = new Set(
    roles
      .filter((role: { role: string }) => role.role === "client")
      .map((role: { user_id: string }) => role.user_id),
  );
  const workspaceMemberIds = new Set(workspaceMembers.map((m) => m.user_id));
  const visibleProfiles = profiles
    .filter(matchesStatus)
    .filter((profile) => !clientUserIds.has(profile.id))
    // Sem membros carregados (ainda carregando, ou ambiente indefinido) não
    // filtra — evita uma tela de time vazia por um instante.
    .filter((profile) => workspaceMemberIds.size === 0 || workspaceMemberIds.has(profile.id));
  const visibleIds = new Set(visibleProfiles.map((p) => p.id));

  const periodStart = startOfDay(parseISO(period.start));
  const periodEnd = endOfDay(parseISO(period.end));
  const isDone = (task: { status: string | null; completed_at: string | null }) =>
    task.status === "done" || Boolean(task.completed_at);
  const isOverdue = (task: {
    due_date: string | null;
    status: string | null;
    completed_at: string | null;
  }) =>
    Boolean(
      task.due_date && !isDone(task) && isBefore(parseISO(task.due_date), startOfDay(new Date())),
    );

  // Deliveries are counted by completion date; open work is counted by its
  // deadline. That makes the team ranking reflect what was actually delivered
  // in the selected period instead of only what was due then.
  const taskBelongsToPeriod = (task: any) =>
    isDone(task)
      ? dateIsInPeriod(task.completed_at, periodStart, periodEnd)
      : dateIsInPeriod(task.due_date, periodStart, periodEnd);
  const periodTasks = tasks
    .filter(taskBelongsToPeriod)
    .filter((task) => !task.assignee_id || visibleIds.has(task.assignee_id));
  const filteredTasks = periodTasks.filter(
    (task) => userFilter === "all" || task.assignee_id === userFilter,
  );
  const latestDueDateChangeByTask = new Map<string, any>();
  dueDateChanges.forEach((change: any) => {
    if (!latestDueDateChangeByTask.has(change.task_id)) {
      latestDueDateChangeByTask.set(change.task_id, change);
    }
  });
  const periodDays = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
  const previousStart = startOfDay(subDays(periodStart, periodDays));
  const previousEnd = endOfDay(subDays(periodStart, 1));
  const previousTasks = tasks.filter((task) =>
    isDone(task)
      ? dateIsInPeriod(task.completed_at, previousStart, previousEnd)
      : dateIsInPeriod(task.due_date, previousStart, previousEnd),
  );

  // Tasks without a deadline are scoped by their creation date. This keeps the
  // risk view inside the chosen period while still showing the responsible people.
  const noDueTasks = tasks
    .filter((task) => !isDone(task) && !task.due_date)
    .filter((task) => dateIsInPeriod(task.created_at, periodStart, periodEnd))
    .filter((task) => userFilter === "all" || task.assignee_id === userFilter)
    .filter((task) => !task.assignee_id || visibleIds.has(task.assignee_id));

  const subtasksByTask = (() => {
    const m = new Map<string, { total: number; done: number }>();
    subtasks.forEach((s: any) => {
      const cur = m.get(s.task_id) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (s.done) cur.done += 1;
      m.set(s.task_id, cur);
    });
    return m;
  })();

  const sumSubtasks = (taskList: any[]) => {
    let total = 0,
      done = 0;
    taskList.forEach((t: { id: string }) => {
      const s = subtasksByTask.get(t.id);
      if (s) {
        total += s.total;
        done += s.done;
      }
    });
    return { total, done };
  };

  const totals = {
    total: filteredTasks.length,
    done: filteredTasks.filter((t) => t.status === "done").length,
    pending: filteredTasks.filter((t) => t.status !== "done").length,
    overdue: filteredTasks.filter(isOverdue).length,
    subtasks: sumSubtasks(filteredTasks),
  };

  const perUser = visibleProfiles
    .filter((profile) => userFilter === "all" || profile.id === userFilter)
    .map((p) => {
      const userTasks = periodTasks.filter((t) => t.assignee_id === p.id);
      const done = userTasks.filter((t) => t.status === "done");
      const overdue = userTasks.filter(isOverdue);
      const completedWithDeadline = done.filter((t) => t.due_date && t.completed_at);
      const onTime = completedWithDeadline.filter(
        (t) => t.due_date && t.completed_at && !completedAfterDueDate(t.completed_at, t.due_date),
      ).length;
      const lateCompleted = completedWithDeadline.filter(
        (t) => t.due_date && t.completed_at && completedAfterDueDate(t.completed_at, t.due_date),
      );
      const lateTasks = [
        ...lateCompleted.map((task) => {
          const change = latestDueDateChangeByTask.get(task.id);
          return {
            id: task.id,
            title: task.title || "Card sem título",
            kind: "Concluída após o prazo",
            dueDateLabel: formatReportDate(task.due_date),
            completedAtLabel: formatReportDate(task.completed_at),
            deadlineChange: change
              ? {
                  oldDueDateLabel: formatReportDate(change.old_due_date),
                  newDueDateLabel: formatReportDate(change.new_due_date),
                  reason: change.reason,
                }
              : null,
          };
        }),
        ...overdue.map((task) => {
          const change = latestDueDateChangeByTask.get(task.id);
          return {
            id: task.id,
            title: task.title || "Card sem título",
            kind: "Em aberto após o prazo",
            dueDateLabel: formatReportDate(task.due_date),
            completedAtLabel: null,
            deadlineChange: change
              ? {
                  oldDueDateLabel: formatReportDate(change.old_due_date),
                  newDueDateLabel: formatReportDate(change.new_due_date),
                  reason: change.reason,
                }
              : null,
          };
        }),
      ];
      const lateCount = lateTasks.length;
      const isAdminRole = roles.some(
        (r: { user_id: string; role: string }) => r.user_id === p.id && r.role === "admin",
      );
      const sub = sumSubtasks(userTasks);
      return {
        id: p.id,
        name: (p.full_name || p.email || "?").slice(0, 14),
        fullName: p.full_name || p.email,
        isAdmin: isAdminRole,
        isActive: (p as any).is_active !== false,
        total: userTasks.length,
        done: done.length,
        pending: userTasks.length - done.length,
        overdue: overdue.length,
        onTime,
        lateCount,
        deliveryBalance: onTime - lateCount,
        lateTasks,
        onTimeRate: completedWithDeadline.length
          ? Math.round((onTime / completedWithDeadline.length) * 100)
          : 0,
        subtasksDone: sub.done,
        subtasksTotal: sub.total,
      };
    });

  const admins = perUser.filter((u) => u.isAdmin);
  const members = perUser.filter((u) => !u.isAdmin);
  const teamRanking = perUser.map((person) => ({
    ...person,
    avatarUrl: profiles.find((profile) => profile.id === person.id)?.avatar_url ?? null,
  }));

  const peopleWithoutDeadline = Array.from(
    new Set(noDueTasks.map((task) => task.assignee_id ?? "__unassigned__")),
  )
    .map((assigneeId) => {
      const personTasks = noDueTasks.filter(
        (task) => (task.assignee_id ?? "__unassigned__") === assigneeId,
      );
      const profile = profiles.find((candidate) => candidate.id === assigneeId);
      return {
        id: assigneeId,
        name: profile?.full_name || profile?.email || "Sem responsável",
        tasks: personTasks,
      };
    })
    .sort((a, b) => b.tasks.length - a.tasks.length || a.name.localeCompare(b.name));

  const statusFlow = statuses
    .map((status) => ({
      name: status.name,
      total: filteredTasks.filter((task) => task.status_id === status.id).length,
      color: status.color || "#64748b",
    }))
    .filter((item) => item.total > 0);
  const priorityData = [
    {
      name: "Urgente",
      value: filteredTasks.filter((task) => !isDone(task) && task.priority === "urgent").length,
      color: "#dc2626",
    },
    {
      name: "Alta",
      value: filteredTasks.filter((task) => !isDone(task) && task.priority === "high").length,
      color: "#f59e0b",
    },
    {
      name: "Média",
      value: filteredTasks.filter((task) => !isDone(task) && task.priority === "medium").length,
      color: "#2563eb",
    },
    {
      name: "Baixa",
      value: filteredTasks.filter((task) => !isDone(task) && task.priority === "low").length,
      color: "#64748b",
    },
  ];
  const capacityRows = perUser
    .map((person) => {
      const personTasks = filteredTasks.filter(
        (task) => task.assignee_id === person.id && !isDone(task),
      );
      return {
        ...person,
        open: personTasks.length,
        critical: personTasks.filter(
          (task) => task.priority === "urgent" || task.priority === "high",
        ).length,
      };
    })
    .sort((a, b) => b.open - a.open || b.critical - a.critical);
  const dueDateChangesInPeriod = dueDateChanges.filter((change) =>
    dateIsInPeriod(change.created_at, periodStart, periodEnd),
  ).length;
  const completedInPreviousPeriod = previousTasks.filter(isDone).length;
  const createdInPeriod = tasks.filter((task) =>
    dateIsInPeriod(task.created_at, periodStart, periodEnd),
  ).length;
  const createdInPreviousPeriod = tasks.filter((task) =>
    dateIsInPeriod(task.created_at, previousStart, previousEnd),
  ).length;
  const requestMetrics = (() => {
    const created = serviceRequests.filter((request) =>
      dateIsInPeriod(request.created_at, periodStart, periodEnd),
    );
    const resolved = serviceRequests.filter((request) =>
      dateIsInPeriod(request.resolved_at, periodStart, periodEnd),
    );
    const overdue = serviceRequests.filter(
      (request) =>
        request.status !== "resolved" &&
        request.due_date &&
        isBefore(parseISO(request.due_date), startOfDay(new Date())),
    );
    const resolutionHours = resolved
      .filter((request) => request.resolved_at)
      .map(
        (request) =>
          (parseISO(request.resolved_at!).getTime() - parseISO(request.created_at).getTime()) /
          3_600_000,
      );
    return {
      created: created.length,
      resolved: resolved.length,
      overdue: overdue.length,
      averageHours: resolutionHours.length
        ? Math.round(
            resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length,
          )
        : null,
    };
  })();
  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Visão macro de entregas, pendências e riscos da operação
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Somente ativos</SelectItem>
              <SelectItem value="inactive">Somente inativos</SelectItem>
              <SelectItem value="all">Ativos + inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {visibleProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                  {(p as any).is_active === false ? " (inativo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="h-4 w-4 text-[#5d6e3e]" /> Período analisado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(periodStart, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} até{" "}
            {format(periodEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            Início
            <Input
              type="date"
              value={period.start}
              max={period.end}
              onChange={(event) =>
                setPeriod((current) => ({ ...current, start: event.target.value }))
              }
              className="h-9 w-36"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Fim
            <Input
              type="date"
              value={period.end}
              min={period.start}
              onChange={(event) =>
                setPeriod((current) => ({ ...current, end: event.target.value }))
              }
              className="h-9 w-36"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPeriod(currentMonthPeriod)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Mês vigente
          </Button>
        </div>
      </Card>

      <div
        className="flex max-w-full overflow-x-auto border-b"
        role="tablist"
        aria-label="Visões dos relatórios"
      >
        {[
          ["briefing", "Briefing mensal"],
          ["summary", "Resumo"],
          ["operations", "Operação"],
          ["team", "Ranking da equipe"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={reportView === id}
            onClick={() => setReportView(id as typeof reportView)}
            className={`relative shrink-0 px-4 py-3 text-sm font-medium ${reportView === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {reportView === id && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#5d6e3e]" />
            )}
          </button>
        ))}
      </div>

      <div
        className={reportView === "summary" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-6" : "hidden"}
      >
        <Kpi label="Total" value={totals.total} icon={ListTodo} color="#2563eb" />
        <Kpi label="Concluídas" value={totals.done} icon={CheckCircle2} color="#059669" />
        <Kpi label="Pendentes" value={totals.pending} icon={Clock} color="#f59e0b" />
        <Kpi label="Atrasadas" value={totals.overdue} icon={AlertTriangle} color="#dc2626" />
        <Kpi
          label="Subtarefas"
          value={`${totals.subtasks.done}/${totals.subtasks.total}`}
          icon={ListChecks}
          color="#0ea5e9"
        />
      </div>

      <div className={reportView === "briefing" ? "block" : "hidden"}>
        <MonthlyBriefingPanel
          periodLabel={format(periodStart, "MMMM 'de' yyyy", { locale: ptBR })}
          totals={totals}
          created={createdInPeriod}
          previousCompleted={completedInPreviousPeriod}
          team={perUser}
          peopleWithoutDeadline={peopleWithoutDeadline}
        />
      </div>

      <div className={reportView === "operations" ? "space-y-4" : "hidden"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Entradas no período"
            value={createdInPeriod}
            icon={ArrowDownUp}
            color="#2563eb"
          />
          <Kpi label="Entregas no período" value={totals.done} icon={TrendingUp} color="#059669" />
          <Kpi
            label="Alterações de prazo"
            value={dueDateChangesInPeriod}
            icon={Clock}
            color="#d97706"
          />
          <Kpi
            label="Solicitações vencidas"
            value={requestMetrics.overdue}
            icon={TicketCheck}
            color="#dc2626"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <ArrowDownUp className="h-4 w-4 text-[#5d6e3e]" /> Entrada × saída
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compara o período selecionado com o período imediatamente anterior de mesma
                  duração.
                </p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      period: "Anterior",
                      entradas: createdInPreviousPeriod,
                      entregas: completedInPreviousPeriod,
                    },
                    { period: "Selecionado", entradas: createdInPeriod, entregas: totals.done },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="entradas"
                    name="Tarefas criadas"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="entregas"
                    name="Tarefas concluídas"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Gauge className="h-4 w-4 text-[#5d6e3e]" /> Fluxo atual por etapa
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Volume de trabalho que está em cada etapa no período.
            </p>
            <div className="mt-5 space-y-4">
              {statusFlow.length ? (
                statusFlow.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.total}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (item.total / Math.max(filteredTasks.length, 1)) * 100)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa no período.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <UsersRound className="h-4 w-4 text-[#5d6e3e]" /> Capacidade da equipe
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Carga aberta no período, destacando prioridades alta e urgente.
              </p>
            </div>
            <div className="divide-y">
              {capacityRows.map((person) => (
                <div
                  key={person.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.done} entrega(s) concluída(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{person.open}</p>
                    <p className="text-xs text-muted-foreground">em aberto</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      person.critical
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "text-muted-foreground"
                    }
                  >
                    {person.critical} crítica(s)
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flame className="h-4 w-4 text-[#dc2626]" /> Prioridades abertas
            </h2>
            <div className="mt-5 space-y-4">
              {priorityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </span>
                  <span className="text-xl font-bold">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Timer className="h-4 w-4 text-[#5d6e3e]" /> Solicitações
              </p>
              <p className="mt-2">
                {requestMetrics.created} abertas · {requestMetrics.resolved} resolvidas
              </p>
              <p className="mt-1">
                {requestMetrics.averageHours === null
                  ? "Ainda não há tempo médio de resolução no período."
                  : `Tempo médio até solução: ${requestMetrics.averageHours}h.`}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className={reportView === "summary" ? "block" : "hidden"}>
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Comparativo por usuário</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={perUser}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="done" name="Concluídas" stackId="a" fill="#059669" />
                <Bar dataKey="pending" name="Pendentes" stackId="a" fill="#f59e0b" />
                <Bar dataKey="overdue" name="Atrasadas" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className={reportView === "team" ? "space-y-4" : "hidden"}>
        <TeamRankingPanel members={teamRanking} onViewLateTasks={setLateTasksMember} />
        <UserTable title="Administradores" icon={ShieldCheck} rows={admins} />
        <UserTable title="Colaboradores" rows={members} icon={UserIcon} />
      </div>

      <LateTasksDialog
        member={lateTasksMember}
        open={Boolean(lateTasksMember)}
        onOpenChange={(open) => !open && setLateTasksMember(null)}
      />
    </div>
  );
}

function UserTable({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof UserIcon;
  rows: any[];
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" /> {title}{" "}
        <span className="text-xs text-muted-foreground">({rows.length})</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário neste grupo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Usuário</th>
                <th className="py-2 text-center">Total</th>
                <th className="py-2 text-center">Concluídas</th>
                <th className="py-2 text-center">Pendentes</th>
                <th className="py-2 text-center">Atrasadas</th>
                <th className="py-2 text-center">Subtarefas</th>
                <th className="py-2 text-center">No prazo</th>
                <th className="py-2 text-center">% prazo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const subPct = r.subtasksTotal
                  ? Math.round((r.subtasksDone / r.subtasksTotal) * 100)
                  : 0;
                return (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span>{r.fullName}</span>
                        {!r.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Desativado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-center font-medium">{r.total}</td>
                    <td className="py-2 text-center text-emerald-600">{r.done}</td>
                    <td className="py-2 text-center text-amber-600">{r.pending}</td>
                    <td className="py-2 text-center text-red-600">{r.overdue}</td>
                    <td className="py-2 text-center text-sky-600">
                      {r.subtasksTotal ? `${r.subtasksDone}/${r.subtasksTotal} (${subPct}%)` : "—"}
                    </td>
                    <td className="py-2 text-center">{r.onTime}</td>
                    <td className="py-2 text-center">{r.onTimeRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
