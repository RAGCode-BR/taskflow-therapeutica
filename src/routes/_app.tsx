import { createFileRoute, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isClient, hasPermission, mustChangePassword } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (mustChangePassword && pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  const clientRoutePermissions: Array<[string, string]> = [
    ["/dashboard", "dashboard"],
    ["/tasks", "tasks"],
    ["/conversations", "conversations"],
    ["/obligations", "obligations"],
    ["/clients", "clients"],
    ["/reports", "reports"],
    ["/trash", "trash"],
    ["/settings", "settings"],
  ];
  const clientCanAccessCurrentRoute =
    pathname.startsWith("/mural") ||
    clientRoutePermissions.some(
      ([path, permission]) => pathname.startsWith(path) && hasPermission(permission),
    );
  if (isClient && !clientCanAccessCurrentRoute) {
    return <Navigate to="/mural" replace />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
