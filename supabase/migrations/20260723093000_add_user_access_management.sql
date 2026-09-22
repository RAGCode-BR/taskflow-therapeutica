-- User categories and per-user application access managed by administrators.
ALTER TYPE public.app_role RENAME VALUE 'member' TO 'collaborator';

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['dashboard', 'tasks', 'notes']::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_permissions_select_own_or_admin
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_permissions_admin_manage
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_user_permissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_permissions_updated_at();

-- Existing collaborators keep the complete operational access they had before this feature.
INSERT INTO public.user_permissions (user_id, permissions)
SELECT user_id, ARRAY['dashboard', 'tasks', 'notes', 'import_ata', 'clients', 'portal', 'calendar', 'trash', 'settings']::TEXT[]
FROM public.user_roles
WHERE role = 'collaborator'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  assigned_role := CASE WHEN user_count = 1 THEN 'admin'::public.app_role ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'collaborator'::public.app_role) END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  INSERT INTO public.user_permissions (user_id, permissions)
  VALUES (
    NEW.id,
    CASE
      WHEN assigned_role = 'admin' THEN ARRAY['dashboard', 'tasks', 'notes', 'import_ata', 'clients', 'reports', 'portal', 'calendar', 'users', 'trash', 'settings']::TEXT[]
      WHEN assigned_role = 'client' THEN ARRAY['portal']::TEXT[]
      ELSE ARRAY['dashboard', 'tasks', 'notes']::TEXT[]
    END
  );
  RETURN NEW;
END;
$$;
