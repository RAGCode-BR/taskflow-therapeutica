/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase types are regenerated after the migration is applied. */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ObligationFrequency = "daily" | "weekly" | "monthly";
export type ObligationMonthRule = "specific_days" | "last_day" | "last_business_day";

export interface Obligation {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assignee_id: string | null;
  frequency: ObligationFrequency;
  interval_count: number;
  days_of_week: number[];
  days_of_month: number[];
  month_rule: ObligationMonthRule;
  business_days_only: boolean;
  start_date: string;
  end_date: string | null;
  create_before_days: number;
  due_time: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  column_id: string | null;
  status_id: string | null;
  department_id: string | null;
  meeting_mode: boolean;
  /** Dias de antecedência do aviso aos participantes. */
  reminder_days_before: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObligationDepartment {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Em quais reuniões um item da pauta padrão entra. */
export type AgendaCadence = "every" | "biweekly" | "first_of_month" | "last_of_month" | "until_day";

/** Item da pauta padrão: é copiado para as reuniões conforme a periodicidade. */
export interface ObligationTaskTemplate {
  id: string;
  obligation_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: Obligation["priority"] | null;
  position: number;
  cadence: AgendaCadence;
  cadence_day: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ObligationOccurrenceStatus = "scheduled" | "open" | "completed" | "skipped";

/** Uma reunião gerada pela recorrência. */
export interface ObligationOccurrence {
  id: string;
  workspace_id: string;
  obligation_id: string;
  due_date: string;
  due_time: string | null;
  status: ObligationOccurrenceStatus;
  task_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  /** Quando a pauta foi copiada para a reunião; antes disso ela segue a pauta padrão. */
  agenda_prepared_at: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AgendaItemResult = "done" | "task";

/** Item da pauta de uma reunião específica. */
export interface ObligationAgendaItem {
  id: string;
  occurrence_id: string;
  template_id: string | null;
  title: string;
  position: number;
  result: AgendaItemResult | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Pauta prevista de uma reunião que ainda não teve a pauta copiada. */
export interface AgendaPreviewItem {
  template_id: string;
  title: string;
  position: number;
}

export interface ObligationParticipant {
  obligation_id: string;
  user_id: string;
}

export interface DepartmentMember {
  department_id: string;
  user_id: string;
}

function useObligationRealtime() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useAuth();

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const channel = supabase
      .channel(`obligations-${activeWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "obligations" },
        () => void queryClient.invalidateQueries({ queryKey: ["obligations"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "obligation_departments" },
        () => void queryClient.invalidateQueries({ queryKey: ["obligation-departments"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "obligation_occurrences" },
        () => void queryClient.invalidateQueries({ queryKey: ["obligation-occurrences"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "obligation_agenda_items" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["obligation-agenda-items"] });
          void queryClient.invalidateQueries({ queryKey: ["obligation-agenda-preview"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeWorkspace?.id, queryClient]);
}

export function useObligationDepartments() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-departments", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("obligation_departments" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("position")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ObligationDepartment[];
    },
  });
}

export function useObligationTaskTemplates(obligationId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["obligation-task-templates", obligationId],
    enabled: !!user && !!obligationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("obligation_task_templates" as any) as any)
        .select("*")
        .eq("obligation_id", obligationId)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ObligationTaskTemplate[];
    },
  });
}

/** Pautas fixas de todas as obrigações do ambiente, para exibir em cada reunião. */
export function useAllObligationTaskTemplates() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-task-templates", "all", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("obligation_task_templates" as any) as any)
        .select("*")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ObligationTaskTemplate[];
    },
  });
}

export function useObligations() {
  const { user, activeWorkspace } = useAuth();
  useObligationRealtime();
  return useQuery({
    queryKey: ["obligations", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("obligations" as any) as any)
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Obligation[];
    },
  });
}

/** Reuniões de um ano para trás até seis meses à frente. */
export function useObligationOccurrences() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-occurrences", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      const until = new Date();
      until.setMonth(until.getMonth() + 7);
      const { data, error } = await (supabase.from("obligation_occurrences" as any) as any)
        .select("*")
        .gte("due_date", from.toISOString().slice(0, 10))
        .lte("due_date", until.toISOString().slice(0, 10))
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ObligationOccurrence[];
    },
  });
}

/** Itens das pautas já copiadas para as reuniões (últimos 90 dias em diante). */
export function useObligationAgendaItems() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-agenda-items", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - 90);
      const { data, error } = await (supabase.from("obligation_agenda_items" as any) as any)
        .select("*, obligation_occurrences!inner(due_date)")
        .gte("obligation_occurrences.due_date", from.toISOString().slice(0, 10))
        .order("position")
        .order("created_at");
      if (error) throw error;
      return ((data ?? []) as Array<ObligationAgendaItem & { obligation_occurrences?: unknown }>).map(
        ({ obligation_occurrences: _occurrence, ...item }) => item as ObligationAgendaItem,
      );
    },
  });
}

/** Pauta prevista (calculada no banco a partir da pauta padrão e da periodicidade). */
export function useObligationAgendaPreview(occurrenceId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["obligation-agenda-preview", occurrenceId],
    enabled: !!user && !!occurrenceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("obligation_agenda_preview", {
        target_occurrence_id: occurrenceId,
      });
      if (error) throw error;
      return (data ?? []) as AgendaPreviewItem[];
    },
  });
}

export function useObligationParticipants() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-participants", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("obligation_participants" as any) as any).select(
        "obligation_id, user_id",
      );
      if (error) throw error;
      return (data ?? []) as ObligationParticipant[];
    },
  });
}

export function useDepartmentMembers() {
  const { user, activeWorkspace } = useAuth();
  return useQuery({
    queryKey: ["obligation-department-members", activeWorkspace?.id],
    enabled: !!user && !!activeWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (
        supabase.from("obligation_department_members" as any) as any
      ).select("department_id, user_id");
      if (error) throw error;
      return (data ?? []) as DepartmentMember[];
    },
  });
}
