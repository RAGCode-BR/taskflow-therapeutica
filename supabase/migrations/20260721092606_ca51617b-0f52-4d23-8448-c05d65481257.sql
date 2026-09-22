
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
