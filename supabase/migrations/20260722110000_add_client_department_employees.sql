ALTER TABLE public.client_departments
  ADD COLUMN IF NOT EXISTS position integer;

WITH ordered_departments AS (
  SELECT id, row_number() OVER (PARTITION BY client_id ORDER BY created_at, id) - 1 AS new_position
  FROM public.client_departments
)
UPDATE public.client_departments AS department
SET position = ordered_departments.new_position
FROM ordered_departments
WHERE department.id = ordered_departments.id
  AND department.position IS NULL;

ALTER TABLE public.client_departments
  ALTER COLUMN position SET DEFAULT 0,
  ALTER COLUMN position SET NOT NULL;

DROP POLICY IF EXISTS client_departments_update_admin ON public.client_departments;
CREATE POLICY client_departments_update_admin
  ON public.client_departments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS client_departments_delete_admin ON public.client_departments;
CREATE POLICY client_departments_delete_admin
  ON public.client_departments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.client_department_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.client_departments(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  registration text,
  cbo text,
  role text,
  salary numeric(12, 2),
  activities text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_department_employees_department_id_idx
  ON public.client_department_employees(department_id);

ALTER TABLE public.client_department_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_department_employees_select_auth
  ON public.client_department_employees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY client_department_employees_insert_admin
  ON public.client_department_employees
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY client_department_employees_update_admin
  ON public.client_department_employees
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY client_department_employees_delete_admin
  ON public.client_department_employees
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
