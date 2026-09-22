-- Invoices shown in the client portal. Amounts use NUMERIC to avoid currency rounding errors.
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'boleto', 'link')),
  payment_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_invoices_client_due_idx ON public.client_invoices (client_id, due_date);
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

-- Administrators see all invoices. A client account only sees invoices for the
-- client_id assigned in its trusted auth app_metadata.
CREATE POLICY client_invoices_read_admin_or_own_client ON public.client_invoices
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR client_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'client_id', '')::UUID
  );
CREATE POLICY client_invoices_admin_manage ON public.client_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_client_invoices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_client_invoices_updated_at BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_client_invoices_updated_at();
