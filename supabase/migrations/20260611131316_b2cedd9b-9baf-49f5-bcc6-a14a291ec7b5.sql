
ALTER TABLE public.client_notes 
  ADD COLUMN IF NOT EXISTS note_date date NOT NULL DEFAULT (now()::date),
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_html text;

CREATE INDEX IF NOT EXISTS idx_client_notes_task_id ON public.client_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_note_date ON public.client_notes(note_date);
