-- Task creation requests use `INSERT ... RETURNING` through Supabase's
-- `.select().single()`. The new row must be visible under the same verified
-- JWT context, even when the request role claim is not `authenticated`.
DROP POLICY IF EXISTS tasks_select ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL AND public.can_view_task(id));
