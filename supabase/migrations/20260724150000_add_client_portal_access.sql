-- Vincula cada login de cliente a um único cliente e aplica esse vínculo no RLS.
CREATE TABLE IF NOT EXISTS public.client_user_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_user_links_client_idx ON public.client_user_links (client_id);
ALTER TABLE public.client_user_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.client_user_links TO authenticated;
GRANT ALL ON public.client_user_links TO service_role;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_user_links WHERE user_id = auth.uid() LIMIT 1
$$;

DROP POLICY IF EXISTS client_user_links_select ON public.client_user_links;
CREATE POLICY client_user_links_select ON public.client_user_links
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS client_user_links_admin_manage ON public.client_user_links;
CREATE POLICY client_user_links_admin_manage ON public.client_user_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_client_user_links_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_client_user_links_updated_at ON public.client_user_links;
CREATE TRIGGER trg_client_user_links_updated_at BEFORE UPDATE ON public.client_user_links
  FOR EACH ROW EXECUTE FUNCTION public.set_client_user_links_updated_at();

-- Client accounts can only see their own client record; internal users keep their
-- existing client directory access.
DROP POLICY IF EXISTS clients_select_auth ON public.clients;
CREATE POLICY clients_select_auth ON public.clients
  FOR SELECT TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'client'::public.app_role)
    OR id = public.current_client_id()
  );

-- Client accounts receive read-only access to their client's tasks. Internal
-- task visibility continues to use the existing collaborator rules.
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'client'::public.app_role) AND client_id = public.current_client_id())
    OR (
      NOT public.has_role(auth.uid(), 'client'::public.app_role)
      AND public.can_view_task(id)
    )
  );

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (NOT public.has_role(auth.uid(), 'client'::public.app_role) AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (NOT public.has_role(auth.uid(), 'client'::public.app_role) AND public.can_view_task(id))
  WITH CHECK (NOT public.has_role(auth.uid(), 'client'::public.app_role) AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'client'::public.app_role)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR created_by = auth.uid())
  );

-- Invoice access is based on the live database link, rather than JWT metadata,
-- so a new client assignment takes effect immediately.
DROP POLICY IF EXISTS client_invoices_read_admin_or_own_client ON public.client_invoices;
CREATE POLICY client_invoices_read_admin_or_own_client ON public.client_invoices
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'client'::public.app_role)
      AND client_id = public.current_client_id()
    )
  );