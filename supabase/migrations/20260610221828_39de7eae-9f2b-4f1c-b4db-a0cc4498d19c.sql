
CREATE TABLE public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_notes_all_auth ON public.client_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER client_notes_set_updated_at BEFORE UPDATE ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX client_notes_client_idx ON public.client_notes(client_id);

CREATE TABLE public.client_note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.client_notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_note_attachments TO authenticated;
GRANT ALL ON public.client_note_attachments TO service_role;
ALTER TABLE public.client_note_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_note_att_all_auth ON public.client_note_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX client_note_att_note_idx ON public.client_note_attachments(note_id);
