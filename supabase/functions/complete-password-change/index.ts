import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!authorization || !token) return response({ error: "Sessão não encontrada." }, 401);

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(projectUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return response({ error: "Sessão inválida." }, 401);
    const payload = await request.json().catch(() => ({}));
    const password = payload?.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 128)
      return response({ error: "A nova senha deve ter entre 8 e 128 caracteres." });
    if (!data.user.email) return response({ error: "Identificador de acesso não encontrado." });

    // Refuse the current temporary password. This validation happens on the
    // server so a caller cannot clear the first-login flag without changing it.
    const passwordCheckClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: currentPassword } = await passwordCheckClient.auth.signInWithPassword({
      email: data.user.email,
      password,
    });
    if (currentPassword.session)
      return response({ error: "A senha definitiva deve ser diferente da senha temporária." });

    const admin = createClient(projectUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const currentAppMetadata = data.user.app_metadata ?? {};
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      password,
      app_metadata: { ...currentAppMetadata, must_change_password: false },
    });
    if (updateError) throw updateError;

    // Updating a password through the Admin API revokes the refresh token from
    // the temporary-password session. Create a replacement session immediately
    // so the browser never tries to refresh a token that no longer exists.
    const replacementClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: replacement, error: replacementError } =
      await replacementClient.auth.signInWithPassword({
        email: data.user.email,
        password,
      });
    if (replacementError || !replacement.session) {
      console.error("Password changed, but replacement session creation failed", replacementError);
      return response(
        {
          error:
            "A senha foi alterada, mas a nova sessão não pôde ser criada. Entre novamente com a senha definitiva.",
          password_changed: true,
        },
        409,
      );
    }

    return response({
      ok: true,
      session: {
        access_token: replacement.session.access_token,
        refresh_token: replacement.session.refresh_token,
      },
    });
  } catch (error) {
    console.error(error);
    return response({
      error: error instanceof Error ? error.message : "Não foi possível concluir a troca de senha.",
    });
  }
});
