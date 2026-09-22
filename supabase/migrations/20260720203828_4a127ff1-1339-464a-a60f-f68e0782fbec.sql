
-- Attach missing notification/sync triggers so they actually fire.

DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.tasks;
CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

DROP TRIGGER IF EXISTS trg_notify_subtask_assignment ON public.subtasks;
CREATE TRIGGER trg_notify_subtask_assignment
AFTER INSERT OR UPDATE OF assignee_id ON public.subtasks
FOR EACH ROW EXECUTE FUNCTION public.notify_subtask_assignment();

DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.comments;
CREATE TRIGGER trg_notify_task_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

DROP TRIGGER IF EXISTS trg_notify_task_attachment ON public.attachments;
CREATE TRIGGER trg_notify_task_attachment
AFTER INSERT ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.notify_task_attachment();

DROP TRIGGER IF EXISTS trg_sync_subtask_completed_at ON public.subtasks;
CREATE TRIGGER trg_sync_subtask_completed_at
BEFORE INSERT OR UPDATE OF done ON public.subtasks
FOR EACH ROW EXECUTE FUNCTION public.sync_subtask_completed_at();

DROP TRIGGER IF EXISTS trg_set_task_created_by ON public.tasks;
CREATE TRIGGER trg_set_task_created_by
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_created_by();
