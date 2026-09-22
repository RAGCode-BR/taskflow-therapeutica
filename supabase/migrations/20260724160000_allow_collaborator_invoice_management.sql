-- Finance staff can be administrators or collaborators. Client accounts remain read-only.
DROP POLICY IF EXISTS client_invoices_admin_manage ON public.client_invoices;

CREATE POLICY client_invoices_admin_or_collaborator_manage ON public.client_invoices
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'collaborator'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'collaborator'::public.app_role)
  );
