
-- ============================================================
-- Per-user kanban customization + soft-delete + orientation
-- ============================================================

-- 1) Schema additions
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_by uuid;
CREATE INDEX IF NOT EXISTS tasks_deleted_at_idx ON public.tasks(deleted_at);

ALTER TABLE public.board_preferences
  ADD COLUMN IF NOT EXISTS kanban_orientation text NOT NULL DEFAULT 'vertical';

-- 2) Backfill NULL created_by on existing tags/statuses/columns to the first admin
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' ORDER BY id LIMIT 1;
  IF admin_id IS NOT NULL THEN
    UPDATE public.task_tags     SET created_by = admin_id WHERE created_by IS NULL;
    UPDATE public.task_statuses SET created_by = admin_id WHERE created_by IS NULL;
    UPDATE public.kanban_columns SET created_by = admin_id WHERE created_by IS NULL;
  END IF;
END $$;

-- 3) Per-user RLS on task_tags
DROP POLICY IF EXISTS "Auth read tags"  ON public.task_tags;
DROP POLICY IF EXISTS "Auth write tags" ON public.task_tags;
DROP POLICY IF EXISTS task_tags_all ON public.task_tags;
DROP POLICY IF EXISTS task_tags_select ON public.task_tags;
DROP POLICY IF EXISTS task_tags_modify ON public.task_tags;

CREATE POLICY task_tags_select ON public.task_tags FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY task_tags_insert ON public.task_tags FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY task_tags_update ON public.task_tags FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY task_tags_delete ON public.task_tags FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 4) Per-user RLS on task_statuses
DROP POLICY IF EXISTS "Auth read statuses"  ON public.task_statuses;
DROP POLICY IF EXISTS "Auth write statuses" ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_all ON public.task_statuses;
DROP POLICY IF EXISTS task_statuses_select ON public.task_statuses;

CREATE POLICY task_statuses_select ON public.task_statuses FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY task_statuses_insert ON public.task_statuses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY task_statuses_update ON public.task_statuses FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY task_statuses_delete ON public.task_statuses FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 5) Per-user RLS on kanban_columns
DROP POLICY IF EXISTS "Auth read columns"  ON public.kanban_columns;
DROP POLICY IF EXISTS "Auth write columns" ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_all ON public.kanban_columns;
DROP POLICY IF EXISTS kanban_columns_select ON public.kanban_columns;

CREATE POLICY kanban_columns_select ON public.kanban_columns FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY kanban_columns_insert ON public.kanban_columns FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY kanban_columns_update ON public.kanban_columns FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY kanban_columns_delete ON public.kanban_columns FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 6) Auto-set created_by on insert
CREATE OR REPLACE FUNCTION public.set_created_by_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS task_tags_set_owner ON public.task_tags;
CREATE TRIGGER task_tags_set_owner BEFORE INSERT ON public.task_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_owner();

DROP TRIGGER IF EXISTS task_statuses_set_owner ON public.task_statuses;
CREATE TRIGGER task_statuses_set_owner BEFORE INSERT ON public.task_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_owner();

DROP TRIGGER IF EXISTS kanban_columns_set_owner ON public.kanban_columns;
CREATE TRIGGER kanban_columns_set_owner BEFORE INSERT ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by_owner();

-- 7) Seed defaults for a user (idempotent)
CREATE OR REPLACE FUNCTION public.seed_user_kanban_defaults(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_statuses WHERE created_by = _user_id) THEN
    INSERT INTO public.task_statuses (name, color, position, is_completed, is_active, created_by) VALUES
      ('Em andamento', '#3b82f6', 0, false, true, _user_id),
      ('Concluída',    '#10b981', 1, true,  true, _user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.kanban_columns WHERE created_by = _user_id) THEN
    INSERT INTO public.kanban_columns (name, color, position, created_by) VALUES
      ('A fazer',  '#64748b', 0, _user_id),
      ('Concluída','#10b981', 1, _user_id);
  END IF;
END $$;

-- 8) Hook into new-user creation
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

  PERFORM public.seed_user_kanban_defaults(NEW.id);
  RETURN NEW;
END $$;

-- 9) Backfill defaults for any existing profile that lacks them
DO $$
DECLARE p_id uuid;
BEGIN
  FOR p_id IN SELECT id FROM public.profiles LOOP
    PERFORM public.seed_user_kanban_defaults(p_id);
  END LOOP;
END $$;
