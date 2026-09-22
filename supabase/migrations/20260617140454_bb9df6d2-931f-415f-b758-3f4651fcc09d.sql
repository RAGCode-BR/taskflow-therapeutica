DROP POLICY IF EXISTS kanban_columns_select ON public.kanban_columns;
CREATE POLICY kanban_columns_select ON public.kanban_columns
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

DROP POLICY IF EXISTS task_statuses_select ON public.task_statuses;
CREATE POLICY task_statuses_select ON public.task_statuses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());