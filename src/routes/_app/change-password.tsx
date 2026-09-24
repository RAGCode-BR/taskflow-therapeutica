import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/change-password")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { mustChangePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  if (!mustChangePassword) return <Navigate to="/mural" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return toast.error("As senhas não coincidem.");

    setLoading(true);
    try {
      const { data, error: completionError } = await supabase.functions.invoke(
        "complete-password-change",
        { body: { password } },
      );
      if (completionError) throw completionError;
      if (data?.error) throw new Error(data.error);

      const accessToken = data?.session?.access_token;
      const refreshToken = data?.session?.refresh_token;
      if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
        throw new Error("A nova sessão não foi recebida. Entre novamente com a senha definitiva.");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      toast.success("Senha definitiva criada com sucesso.");
      navigate({ to: "/mural", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível concluir a troca de senha.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-2rem)] place-items-center p-6">
      <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Crie sua senha definitiva</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Por segurança, a senha temporária só pode ser usada no primeiro acesso.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password-confirmation">Confirme a nova senha</Label>
            <Input
              id="new-password-confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar senha definitiva
          </Button>
        </form>
      </Card>
    </div>
  );
}
