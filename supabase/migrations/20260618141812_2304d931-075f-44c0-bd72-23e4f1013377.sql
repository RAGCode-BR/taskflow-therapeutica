
UPDATE public.task_statuses
SET is_completed = true
WHERE is_completed = false
  AND lower(name) IN ('concluída','concluida','concluído','concluido','done','completed','finalizada','finalizado');

UPDATE public.tasks
SET completed_at = COALESCE(completed_at, updated_at, now())
WHERE deleted_at IS NULL
  AND status = 'done'
  AND completed_at IS NULL;

UPDATE public.tasks t
SET status_id = ts.id
FROM public.task_statuses ts
WHERE t.deleted_at IS NULL
  AND t.status = 'done'
  AND ts.is_completed = true
  AND ts.created_by = t.created_by
  AND (
    t.status_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.task_statuses s2
      WHERE s2.id = t.status_id AND s2.is_completed = true
    )
  );

UPDATE public.tasks t
SET status = 'done',
    completed_at = COALESCE(t.completed_at, t.updated_at, now())
FROM public.task_statuses ts
WHERE t.deleted_at IS NULL
  AND t.status_id = ts.id
  AND ts.is_completed = true
  AND (t.status <> 'done' OR t.completed_at IS NULL);
