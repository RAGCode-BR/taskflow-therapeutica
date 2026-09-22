-- Some clients can carry a valid Supabase user JWT while PostgREST receives a
-- role other than `authenticated`. Authorization must be tied to the verified
-- user id, not only to that role claim.
DROP POLICY IF EXISTS tasks_insert ON public.tasks;

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO public
  WITH CHECK (auth.uid() IS NOT NULL);
