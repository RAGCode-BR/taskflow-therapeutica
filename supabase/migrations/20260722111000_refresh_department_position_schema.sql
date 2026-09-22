-- Repair migration for projects where the department ordering migration was applied late.
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

NOTIFY pgrst, 'reload schema';
