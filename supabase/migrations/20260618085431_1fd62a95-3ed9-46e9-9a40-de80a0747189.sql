
-- 1) board_preferences: restrict to authenticated role
DROP POLICY IF EXISTS "own prefs" ON public.board_preferences;
CREATE POLICY "own prefs" ON public.board_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) tasks insert: require created_by = auth.uid() (no NULL bypass)
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 3) Lock down SECURITY DEFINER helper functions: revoke public/anon/authenticated EXECUTE
-- These remain callable from RLS policies (which run as table owner) and from server-side admin code.
REVOKE EXECUTE ON FUNCTION public.seed_user_kanban_defaults(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_task_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_client_note_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_client_file_uploaded_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_created_by_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_interruptions_count() FROM PUBLIC, anon, authenticated;
-- has_role and can_view_task are required by RLS policies for authenticated users; keep grants.
