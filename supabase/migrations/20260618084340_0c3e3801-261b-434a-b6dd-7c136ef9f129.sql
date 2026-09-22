CREATE INDEX IF NOT EXISTS comments_task_position_idx ON public.comments(task_id, position);
CREATE INDEX IF NOT EXISTS subtasks_task_position_idx ON public.subtasks(task_id, position);
CREATE INDEX IF NOT EXISTS attachments_task_created_idx ON public.attachments(task_id, created_at);
CREATE INDEX IF NOT EXISTS tasks_position_created_idx ON public.tasks(position, created_at DESC) WHERE deleted_at IS NULL;