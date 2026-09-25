import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProfiles } from "@/hooks/use-data";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Archive,
  ChevronDown,
  Plus,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserX,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isValidUsername } from "@/lib/user-login";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

const ACCESS_OPTIONS = [
  ["dashboard", "Dashboard"],
  ["tasks", "Minhas tarefas"],
  ["conversations", "Conversas"],
  ["obligations", "Obrigações"],
  ["reports", "Relatórios"],
  ["mural", "Mural"],
  ["trash", "Lixeira"],
  ["settings", "Personalizar"],
] as const;
const SINGLE_WORKSPACE = true;
type Role = "admin" | "collaborator";
type FormState = {
  fullName: string;
  login: string;
  password: string;
  role: Role;
  permissions: string[];
  marketingAccess: boolean;
};
const COLLABORATOR_DEFAULT_PERMISSIONS = [
  "dashboard",
  "tasks",
  "conversations",
  "mural",
  "trash",
  "settings",
];
const defaults: FormState = {
  fullName: "",
  login: "",
  password: "",
  role: "collaborator",
  // Padrão da casa para um colaborador: acesso ao dia a dia. Obrigações e
  // relatórios continuam disponíveis para liberação manual pelo administrador.
  permissions: COLLABORATOR_DEFAULT_PERMISSIONS,
  marketingAccess: false,
};
const roleLabel: Record<Role, string> = {
  admin: "Administrador",
  collaborator: "Colaboradores",
};
// Contas antigas com a categoria "client" (portal descontinuado) são tratadas
// como colaboradores: ao salvar, passam a ser gravadas como Colaborador.
const toRole = (value: string | undefined): Role => (value === "admin" ? "admin" : "collaborator");

function AccessForm({
  value,
  onChange,
  includeCredentials = false,
  marketingOnly = false,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
  includeCredentials?: boolean;
  marketingOnly?: boolean;
}) {
  const toggle = (permission: string) =>
    onChange({
      ...value,
      permissions: value.permissions.includes(permission)
        ? value.permissions.filter((item) => item !== permission)
        : [...value.permissions, permission],
    });
  return (
    <div className="space-y-4">
      {includeCredentials && (
        <>
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input
              value={value.fullName}
              onChange={(e) => onChange({ ...value, fullName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Login</Label>
            <Input
              type="text"
              autoComplete="off"
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,30}[A-Za-z0-9]"
              value={value.login}
              onChange={(e) => onChange({ ...value, login: e.target.value.toLowerCase() })}
              placeholder="Ex.: gabriel.silva"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Senha temporária</Label>
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              No primeiro acesso, o usuário será obrigado a criar uma senha definitiva.
            </p>
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={value.role}
          disabled={marketingOnly}
          onChange={(e) =>
            onChange({
              ...value,
              role: e.target.value as Role,
              permissions:
                // Trocar de Admin para Colaborador não deve carregar sobras de
                // outra categoria — volta ao padrão da casa.
                e.target.value === "collaborator" && value.role !== "collaborator"
                  ? COLLABORATOR_DEFAULT_PERMISSIONS
                  : value.permissions,
            })
          }
        >
          <option value="collaborator">Colaborador</option>
          {!marketingOnly && <option value="admin">Administrador</option>}
        </select>
      </div>
      {!SINGLE_WORKSPACE && !marketingOnly && (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3">
          <span>
            <span className="block text-sm font-medium">
              {includeCredentials ? "Liberar ambiente Marketing" : "Acesso ao ambiente Marketing"}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {value.role === "admin"
                ? "Administradores acessam todos os ambientes automaticamente."
                : includeCredentials
                  ? "O novo usuário entra somente no Marketing, sem acesso à Consultoria."
                  : "Além do ambiente atual, esta pessoa passa a acessar o Marketing."}
            </span>
          </span>
          <Checkbox
            className="mt-0.5"
            checked={value.role === "admin" || value.marketingAccess}
            disabled={value.role === "admin"}
            onCheckedChange={(checked) => onChange({ ...value, marketingAccess: checked === true })}
          />
        </label>
      )}
      <div className="space-y-2">
        <Label>Acessos do sistema</Label>
        <p className="text-xs text-muted-foreground">
          Administradores possuem acesso completo automaticamente.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
          {ACCESS_OPTIONS.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value.role === "admin" || value.permissions.includes(key)}
                disabled={value.role === "admin"}
                onCheckedChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserDetailsForm({
  value,
  onChange,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
}) {
  return (
    <div className="space-y-4 border-b pb-4">
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input
          value={value.fullName}
          onChange={(event) => onChange({ ...value, fullName: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Nova senha</Label>
        <Input
          type="password"
          minLength={6}
          value={value.password}
          onChange={(event) => onChange({ ...value, password: event.target.value })}
          placeholder="Deixe em branco para manter a senha atual"
        />
        <p className="text-xs text-muted-foreground">
          A nova senha deve ter ao menos 6 caracteres.
        </p>
      </div>
    </div>
  );
}

function UsersPage() {
  const { isAdmin, user, loading, activeWorkspace } = useAuth();
  const inMarketing = activeWorkspace?.slug === "marketing";
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: profileEmails = [] } = useQuery({
    queryKey: ["admin_profile_emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_profile_emails");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaults);
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });
  const { data: permissionRows = [] } = useQuery({
    queryKey: ["user_permissions"],
    queryFn: async () =>
      ((await (supabase.from("user_permissions") as any).select("user_id, permissions")).data ??
        []) as { user_id: string; permissions: string[] }[],
  });
  const { data: workspaceRows = [] } = useQuery({
    queryKey: ["workspaces_for_access"],
    queryFn: async () =>
      ((await (supabase.from("workspaces") as any).select("id, slug, name")).data ?? []) as Array<{
        id: string;
        slug: string;
        name: string;
      }>,
  });
  const marketingWorkspace = workspaceRows.find((workspace) => workspace.slug === "marketing");
  const { data: marketingMembers = [] } = useQuery({
    queryKey: ["marketing_members", marketingWorkspace?.id],
    enabled: !SINGLE_WORKSPACE && !!marketingWorkspace?.id,
    queryFn: async () =>
      ((
        await (supabase.from("workspace_memberships") as any)
          .select("user_id, access_grant")
          .eq("workspace_id", marketingWorkspace!.id)
      ).data ?? []) as Array<{
        user_id: string;
        access_grant: "manual" | "admin_policy";
      }>,
  });
  const { data: currentWorkspaceMembers = [] } = useQuery({
    queryKey: ["current_workspace_members", activeWorkspace?.id],
    enabled: !!activeWorkspace?.id,
    queryFn: async () =>
      ((
        await (supabase.from("workspace_memberships") as any)
          .select("user_id")
          .eq("workspace_id", activeWorkspace!.id)
      ).data ?? []) as Array<{ user_id: string }>,
  });
  const invokeAccessManager = async (
    action: "create" | "update" | "delete",
    data: Record<string, unknown>,
  ) => {
    const { data: result, error } = await supabase.functions.invoke("admin-user-access", {
      body: { action, data: { ...data, workspaceSlug: activeWorkspace?.slug } },
    });
    if (error) {
      const details = await error.context
        ?.clone()
        .json()
        .catch(() => null);
      const message = details?.error ?? error.message;
      throw new Error(
        typeof message === "string"
          ? message
          : "Não foi possível processar a solicitação. Verifique a configuração de convites.",
      );
    }
    if (result?.error) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Não foi possível processar a solicitação. Verifique a configuração de convites.",
      );
    }
    return result;
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["roles"] });
    qc.invalidateQueries({ queryKey: ["user_permissions"] });
    qc.invalidateQueries({ queryKey: ["marketing_members"] });
    qc.invalidateQueries({ queryKey: ["current_workspace_members"] });
  };
  const createMutation = useMutation({
    mutationFn: () => {
      if (form.fullName.trim().length < 2) throw new Error("Informe o nome completo.");
      if (!isValidUsername(form.login))
        throw new Error(
          "Use um login de 3 a 32 caracteres, com letras, números, ponto, hífen ou sublinhado.",
        );
      if (form.password.length < 8)
        throw new Error("A senha temporária deve ter ao menos 8 caracteres.");
      return invokeAccessManager(
        "create",
        inMarketing ? { ...form, role: "collaborator", marketingAccess: true } : form,
      );
    },
    onSuccess: () => {
      refresh();
      setCreateOpen(false);
      setForm(defaults);
      toast.success("Usuário criado com senha temporária.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar acesso"),
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      await invokeAccessManager("update", {
        userId: editing!,
        fullName: form.fullName,
        password: form.password || undefined,
        role: form.role,
        permissions: form.permissions,
      });
      // Acesso ao Marketing é associação de ambiente, não permissão de menu —
      // vai por uma função própria e só quando o toggle muda.
      if (!SINGLE_WORKSPACE && form.role === "collaborator") {
        const hasMarketing = marketingMembers.some((member) => member.user_id === editing);
        if (hasMarketing !== form.marketingAccess) {
          const { error } = await (supabase as any).rpc("set_marketing_user_access", {
            target_user_id: editing,
            enabled: form.marketingAccess,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success("Acessos atualizados.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar acessos"),
  });
  const refreshMarketingAccess = () => {
    qc.invalidateQueries({ queryKey: ["marketing_members"] });
    qc.invalidateQueries({ queryKey: ["current_workspace_members"] });
  };
  const setMarketingAccess = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await (supabase as any).rpc("set_marketing_user_access", {
        target_user_id: userId,
        enabled,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      refreshMarketingAccess();
      toast.success(
        variables.enabled
          ? "Marketing liberado para este usuário."
          : "Marketing removido deste usuário.",
      );
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "Não foi possível atualizar o acesso ao Marketing."),
  });
  const setActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await (supabase.from("profiles") as any)
        .update({ is_active: active })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteAccess = useMutation({
    mutationFn: (userId: string) => invokeAccessManager("delete", { userId }),
    onSuccess: () => {
      refresh();
      toast.success("Acesso excluído permanentemente.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir o acesso."),
  });
  const profilesWithCredentials = useMemo(() => {
    const credentialsById = new Map<string, { email: string | null; login: string | null }>(
      (profileEmails as Array<{ id: string; email: string | null; login: string | null }>).map(
        (item) => [item.id, { email: item.email, login: item.login }],
      ),
    );
    return profiles.map((profile) => ({
      ...profile,
      email: credentialsById.get(profile.id)?.email ?? null,
      login: credentialsById.get(profile.id)?.login ?? null,
    }));
  }, [profiles, profileEmails]);
  const workspaceMemberIds = useMemo(
    () => new Set(currentWorkspaceMembers.map((member) => member.user_id)),
    [currentWorkspaceMembers],
  );
  const activeProfiles = useMemo(
    () =>
      profilesWithCredentials.filter(
        (p) => workspaceMemberIds.has(p.id) && (p as any).is_active !== false,
      ),
    [profilesWithCredentials, workspaceMemberIds],
  );
  const inactiveProfiles = useMemo(
    () =>
      profilesWithCredentials.filter(
        (p) => workspaceMemberIds.has(p.id) && (p as any).is_active === false,
      ),
    [profilesWithCredentials, workspaceMemberIds],
  );
  const activeProfilesByRole = useMemo(() => {
    const byRole: Record<Role, any[]> = { admin: [], collaborator: [] };
    for (const profile of activeProfiles) {
      const role = toRole(
        roles.find((item: { user_id: string; role: string }) => item.user_id === profile.id)?.role,
      );
      byRole[role].push(profile);
    }
    return (Object.keys(byRole) as Role[]).map((role) => ({
      role,
      label: roleLabel[role],
      profiles: byRole[role].sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "pt-BR", {
          sensitivity: "base",
        }),
      ),
    }));
  }, [activeProfiles, roles]);
  const openEdit = (id: string) => {
    const profile = profiles.find((item) => item.id === id);
    const role = toRole(
      roles.find((r: { user_id: string; role: string }) => r.user_id === id)?.role,
    );
    setForm({
      ...defaults,
      fullName: profile?.full_name ?? "",
      role,
      permissions: permissionRows.find((p) => p.user_id === id)?.permissions ?? [],
      marketingAccess: marketingMembers.some((member) => member.user_id === id),
    });
    setEditing(id);
  };
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/mural" />;
  const renderProfile = (p: any) => {
    const role = toRole(
      roles.find((r: { user_id: string; role: string }) => r.user_id === p.id)?.role,
    );
    const self = p.id === user?.id;
    const marketingMembership = marketingMembers.find((member) => member.user_id === p.id);
    const canManageMarketing = role === "admin" || role === "collaborator";
    const canToggleMarketing = inMarketing && role === "collaborator";
    const canEditUser = isAdmin;
    const canDeactivateUser = isAdmin;
    const canDeleteUser = isAdmin;
    return (
      <Card key={p.id} className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={p.avatar_url || undefined}
              alt={p.full_name || p.email || "Usuário"}
            />
            <AvatarFallback>
              {(p.full_name || p.email || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{p.full_name || "Sem nome"}</h3>
            <p className="truncate text-xs text-muted-foreground">{p.login ?? p.email}</p>
          </div>
          {role === "admin" ? (
            <ShieldCheck className="h-4 w-4 text-primary" />
          ) : (
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="mt-3 flex gap-1">
          <Badge variant={role === "admin" ? "default" : "secondary"}>{roleLabel[role]}</Badge>
          {self && <Badge variant="outline">Você</Badge>}
        </div>
        {inMarketing && canManageMarketing && (
          <div className="mt-3 rounded-xl border bg-muted/20 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ambiente Marketing</p>
                <p className="text-xs text-muted-foreground">
                  {role === "admin"
                    ? "Acesso administrativo obrigatório"
                    : marketingMembership
                      ? "Colaborador próprio do Marketing"
                      : "Sem acesso a este ambiente"}
                </p>
              </div>
              {canToggleMarketing ? (
                <Button
                  size="sm"
                  variant={marketingMembership ? "outline" : "default"}
                  disabled={setMarketingAccess.isPending}
                  onClick={() =>
                    setMarketingAccess.mutate({ userId: p.id, enabled: !marketingMembership })
                  }
                >
                  {marketingMembership ? "Remover" : "Liberar"}
                </Button>
              ) : role === "admin" ? (
                <Badge variant="secondary">Administrador</Badge>
              ) : (
                <Badge variant="secondary">Gerenciado</Badge>
              )}
            </div>
          </div>
        )}
        <div className="mt-3 border-t pt-3">
          {canEditUser ? (
            <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(p.id)}>
              Definir categoria e acessos
            </Button>
          ) : self ? (
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/settings">Editar meu perfil</Link>
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Acessos são gerenciados pelo responsável.
            </p>
          )}
          {!self && canDeactivateUser && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => setActive.mutate({ userId: p.id, active: false })}
              >
                <UserX className="mr-1 h-3 w-3" /> Desativar acesso
              </Button>
            </>
          )}
          {!self && canDeleteUser && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full text-destructive hover:text-destructive"
              disabled={deleteAccess.isPending}
              onClick={() => {
                if (confirm(`Excluir permanentemente o acesso de "${p.full_name || p.email}"?`)) {
                  deleteAccess.mutate(p.id);
                }
              }}
            >
              <Trash2 className="mr-1 h-3 w-3" /> Excluir acesso
            </Button>
          )}
        </div>
      </Card>
    );
  };
  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Crie logins e defina os acessos de cada usuário.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar acesso</DialogTitle>
                <DialogDescription>
                  Defina o login, a senha temporária, a categoria e as permissões. No primeiro
                  acesso, o usuário criará a própria senha definitiva.
                </DialogDescription>
              </DialogHeader>
              <AccessForm
                value={
                  inMarketing ? { ...form, role: "collaborator", marketingAccess: true } : form
                }
                onChange={setForm}
                includeCredentials
                marketingOnly={inMarketing}
              />
              <DialogFooter>
                <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? "Criando…" : "Criar usuário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>
      <div className="space-y-3">
        {activeProfilesByRole.map(({ role, label, profiles: roleProfiles }) => (
          <Collapsible key={role} defaultOpen={false}>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left transition hover:bg-muted/50">
              {role === "admin" ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 font-semibold">{label}</span>
              <Badge variant="secondary">{roleProfiles.length}</Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              {roleProfiles.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {roleProfiles.map(renderProfile)}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                  Nenhum usuário nesta categoria.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
      {isAdmin && inactiveProfiles.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Archive className="h-4 w-4" /> Desativados ({inactiveProfiles.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveProfiles.map((p: any) => (
              <Card key={p.id} className="border-dashed p-4 opacity-75">
                <p className="font-medium">{p.full_name || p.email}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{p.login ?? p.email}</p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => setActive.mutate({ userId: p.id, active: true })}
                >
                  <UserCheck className="mr-1 h-3 w-3" /> Reativar acesso
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir acessos</DialogTitle>
            <DialogDescription>
              Escolha a categoria e as áreas disponíveis no menu para este usuário.
            </DialogDescription>
          </DialogHeader>
          <UserDetailsForm value={form} onChange={setForm} />
          <AccessForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? "Salvando…" : "Salvar acessos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
