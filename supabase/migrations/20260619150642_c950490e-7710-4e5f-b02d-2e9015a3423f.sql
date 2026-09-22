
-- 1) Per-card width (nullable; null = use board default)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS card_width integer
    CHECK (card_width IS NULL OR (card_width BETWEEN 240 AND 800));

-- 2) Attachments per observation (comment)
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON public.comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_task ON public.comment_attachments(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_attachments TO authenticated;
GRANT ALL ON public.comment_attachments TO service_role;

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_attachments_select" ON public.comment_attachments
  FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

CREATE POLICY "comment_attachments_insert" ON public.comment_attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.can_view_task(task_id));

CREATE POLICY "comment_attachments_delete" ON public.comment_attachments
  FOR DELETE TO authenticated
  USING (public.can_view_task(task_id));

-- 3) Extend storage SELECT/DELETE policies to also accept comment_attachments
DROP POLICY IF EXISTS task_attachments_select_auth ON storage.objects;
CREATE POLICY task_attachments_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM public.attachments a
        JOIN public.tasks t ON t.id = a.task_id
        WHERE a.storage_path = objects.name
          AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
      )
      OR EXISTS (
        SELECT 1 FROM public.comment_attachments ca
        JOIN public.tasks t ON t.id = ca.task_id
        WHERE ca.storage_path = objects.name
          AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
      )
    )
  );

DROP POLICY IF EXISTS task_attachments_delete_own ON storage.objects;
CREATE POLICY task_attachments_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      EXISTS (SELECT 1 FROM public.attachments a WHERE a.storage_path = objects.name AND a.uploaded_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.comment_attachments ca WHERE ca.storage_path = objects.name AND ca.uploaded_by = auth.uid())
    )
  );
