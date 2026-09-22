ALTER TABLE public.task_tags ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Backfill positions per user by name
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY created_by ORDER BY name) - 1 AS rn
  FROM public.task_tags
)
UPDATE public.task_tags t SET position = r.rn FROM ranked r WHERE r.id = t.id;