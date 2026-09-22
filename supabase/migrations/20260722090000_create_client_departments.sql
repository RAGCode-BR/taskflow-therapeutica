CREATE TABLE public.client_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_departments_select_auth
    ON public.client_departments
    FOR SELECT TO authenticated
    USING(true);

CREATE POLICY client_departments_insert_admin
    ON public.client_departments
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));