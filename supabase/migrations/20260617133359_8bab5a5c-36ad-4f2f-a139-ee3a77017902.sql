
-- ============================================================
-- Fix duplicate seeding + lock the built-in "Concluída" column
-- The kanban UI already renders a fixed green "Concluída" drop zone
-- (CompletedColumn), so we must NOT also store a "Concluída" row in
-- public.kanban_columns — that produced visible duplicates.
-- ============================================================

-- 1) Remove "Concluída/Concluído" rows from kanban_columns for everyone.
--    Move any tasks currently parked there to NULL column (they still
--    show up in the green completed area via completed_at/status).
UPDATE public.tasks
SET column_id = NULL
WHERE column_id IN (
  SELECT id FROM public.kanban_columns
  WHERE lower(trim(name)) IN ('concluída','concluida','concluído','concluido')
);

DELETE FROM public.kanban_columns
WHERE lower(trim(name)) IN ('concluída','concluida','concluído','concluido');

-- 2) Deduplicate per-user same-name columns (keep the earliest).
WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY created_by, lower(trim(name))
           ORDER BY created_at NULLS LAST, id
         ) AS rn
  FROM public.kanban_columns
)
DELETE FROM public.kanban_columns
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 3) Rewrite the seed: only "A fazer". Concluída is rendered by the UI
--    as a built-in zone and never lives in kanban_columns anymore.
CREATE OR REPLACE FUNCTION public.seed_user_kanban_defaults(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.task_statuses WHERE created_by = _user_id
  ) THEN
    INSERT INTO public.task_statuses
      (name, color, position, is_completed, is_active, created_by)
    VALUES
      ('Em andamento', '#3b82f6', 0, false, true,  _user_id),
      ('Concluída',    '#10b981', 1, true,  false, _user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.kanban_columns WHERE created_by = _user_id
  ) THEN
    INSERT INTO public.kanban_columns
      (name, color, position, created_by)
    VALUES
      ('A fazer', '#64748b', 0, _user_id);
  END IF;
END
$$;
