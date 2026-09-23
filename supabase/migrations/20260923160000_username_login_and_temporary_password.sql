-- New accounts authenticate with a human-readable username. Supabase Auth
-- still requires an email-shaped identifier internally, so the Edge Function
-- creates a reserved, non-deliverable address and stores the real login here.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_login_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_login_format CHECK (
    login IS NULL OR login ~ '^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_lower_unique
  ON public.profiles (lower(login))
  WHERE login IS NOT NULL;

COMMENT ON COLUMN public.profiles.login IS
  'Login used by username-based accounts. Legacy email accounts keep this column null.';

-- Keep login private from ordinary profile listings. Administrators receive it
-- through the same protected RPC that already exposes account emails.
DROP FUNCTION IF EXISTS public.admin_get_profile_emails();
CREATE FUNCTION public.admin_get_profile_emails()
RETURNS TABLE(id uuid, email text, login text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.login
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.admin_get_profile_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profile_emails() TO authenticated;

-- Preserve the invitation allow-list boundary while accepting both the legacy
-- invite flow and server-created username accounts. The Edge Function inserts
-- the internal address into access_invitations immediately before createUser.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  invitation_is_valid BOOLEAN;
  requested_login text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.access_invitations
    WHERE email = lower(NEW.email)
      AND expires_at > now()
  ) INTO invitation_is_valid;

  IF NOT invitation_is_valid THEN
    RAISE EXCEPTION 'Cadastro público desativado. Solicite acesso ao administrador.';
  END IF;

  DELETE FROM public.access_invitations WHERE email = lower(NEW.email);
  requested_login := NULLIF(lower(trim(NEW.raw_user_meta_data->>'login')), '');

  INSERT INTO public.profiles (id, full_name, email, login)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      requested_login,
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    requested_login
  );
  INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'collaborator'::public.app_role);
  INSERT INTO public.user_permissions (user_id, permissions)
    VALUES (NEW.id, ARRAY['dashboard', 'tasks']::TEXT[]);
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
