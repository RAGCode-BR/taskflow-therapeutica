
-- ============================================================
-- Make tags/statuses/columns GLOBAL (admin-managed)
-- Per-user ordering preferences for columns and tasks
-- ============================================================

-- ---------- 1) Dedup task_tags by normalized name ----------
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS keeper_id
  FROM public.task_tags
)
UPDATE public.task_tag_links l SET tag_id = r.keeper_id
FROM ranked r WHERE l.tag_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS keeper_id
  FROM public.task_tags
)
UPDATE public.tasks t SET tag_id = r.keeper_id
FROM ranked r WHERE t.tag_id = r.id AND r.rn > 1;

-- Collapse duplicate (task_id, tag_id) link rows that may have appeared
DELETE FROM public.task_tag_links a USING public.task_tag_links b
WHERE a.ctid < b.ctid AND a.task_id = b.task_id AND a.tag_id = b.tag_id;

DELETE FROM public.task_tags WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.task_tags
  ) s WHERE rn > 1
);

-- ---------- 2) Dedup task_statuses by normalized name ----------
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS keeper_id
  FROM public.task_statuses
)
UPDATE public.tasks t SET status_id = r.keeper_id
FROM ranked r WHERE t.status_id = r.id AND r.rn > 1;

DELETE FROM public.task_statuses WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.task_statuses
  ) s WHERE rn > 1
);

-- Reset position to be sequential (0,1,2…) using current order
WITH ord AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at NULLS LAST, id) - 1 AS new_pos
  FROM public.task_statuses
)
UPDATE public.task_statuses s SET position = o.new_pos FROM ord o WHERE s.id = o.id;

-- ---------- 3) Dedup kanban_columns by normalized name ----------
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS keeper_id
  FROM public.kanban_columns
)
UPDATE public.tasks t SET column_id = r.keeper_id
FROM ranked r WHERE t.column_id = r.id AND r.rn > 1;

DELETE FROM public.kanban_columns WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.kanban_columns
  ) s WHERE rn > 1
);

WITH ord AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at NULLS LAST, id) - 1 AS new_pos
  FROM public.kanban_columns
)
UPDATE public.kanban_columns k SET position = o.new_pos FROM ord o WHERE k.id = o.id;

-- ---------- 4) Replace RLS: SELECT for all authenticated, write for admins only ----------

-- task_tags
DROP POLICY IF EXISTS task_tags_select ON public.task_tags;
DROP POLICY IF EXISTS task_tags_insert ON public.task_tags;
DROP POLICY IF EXISTS task_tags_update ON public.task_tags;
DROP POLICY IF EXISTS task_tags_delete ON public.task_tags;
DROP POLICY IF EXISTS task_tags_modify ON public.task_tags;
DROP POLICY IF EXISTS task_tags_all ON public.task_tags;
CREATE POLICY task_tags_select_all ON public.task_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY task_tags_admin_write ON public.task_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- task_statuses
DROP POLICY IF EXISTS task_statuses_select ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_insert ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_update ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_delete ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_all ON public.task_statuses;
CREATE POLICY task_statuses_select_all ON public.task_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY task_statuses_admin_write ON public.task_statuses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- kanban_columns
DROP POLICY IF EXISTS kanban_columns_select ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_insert ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_update ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_delete ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_all ON public.kanban_columns;
CREATE POLICY kanban_columns_select_all ON public.kanban_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY kanban_columns_admin_write ON public.kanban_columns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 5) Stop auto-seeding columns/statuses for new users ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;

  RETURN NEW;
END $$;

-- ---------- 6) Per-user column ordering ----------
CREATE TABLE IF NOT EXISTS public.user_column_order (
  user_id uuid NOT NULL,
  column_id uuid NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, column_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_column_order TO authenticated;
GRANT ALL ON public.user_column_order TO service_role;
ALTER TABLE public.user_column_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uco_own ON public.user_column_order;
CREATE POLICY uco_own ON public.user_column_order FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 7) Per-user task ordering ----------
CREATE TABLE IF NOT EXISTS public.user_task_order (
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS user_task_order_user_idx ON public.user_task_order(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_task_order TO authenticated;
GRANT ALL ON public.user_task_order TO service_role;
ALTER TABLE public.user_task_order ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uto_own ON public.user_task_order;
CREATE POLICY uto_own ON public.user_task_order FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
