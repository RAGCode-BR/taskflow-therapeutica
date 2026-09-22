
ALTER TABLE public.client_files
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS client_files_client_position_idx
  ON public.client_files(client_id, position);
