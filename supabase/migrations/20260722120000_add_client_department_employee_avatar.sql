ALTER TABLE public.client_department_employees
  ADD COLUMN IF NOT EXISTS avatar_path text;

NOTIFY pgrst, 'reload schema';
