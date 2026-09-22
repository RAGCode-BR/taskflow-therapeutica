
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX client_files_client_id_idx ON public.client_files(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_files TO authenticated;
GRANT ALL ON public.client_files TO service_role;

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage client_files"
ON public.client_files FOR ALL
TO authenticated
USING (true) WITH CHECK (true);
