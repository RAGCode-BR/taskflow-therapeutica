
CREATE TABLE public.task_tag_links (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX task_tag_links_task_idx ON public.task_tag_links(task_id);
CREATE INDEX task_tag_links_tag_idx ON public.task_tag_links(tag_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_tag_links TO authenticated;
GRANT ALL ON public.task_tag_links TO service_role;
ALTER TABLE public.task_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_tag_links_all_auth" ON public.task_tag_links TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.task_tag_links (task_id, tag_id)
SELECT id, tag_id FROM public.tasks WHERE tag_id IS NOT NULL
ON CONFLICT DO NOTHING;
