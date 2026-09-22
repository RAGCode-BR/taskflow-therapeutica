
-- Isolate client notes & files per user (admins see all)

-- client_notes: created_by owns
DROP POLICY IF EXISTS client_notes_all_auth ON public.client_notes;
CREATE POLICY client_notes_select ON public.client_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY client_notes_insert ON public.client_notes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY client_notes_update ON public.client_notes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY client_notes_delete ON public.client_notes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());

-- auto-fill created_by on insert
CREATE OR REPLACE FUNCTION public.set_client_note_created_by()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_client_notes_created_by ON public.client_notes;
CREATE TRIGGER trg_client_notes_created_by BEFORE INSERT ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_client_note_created_by();

-- client_files: uploaded_by owns
DROP POLICY IF EXISTS "Authenticated can manage client_files" ON public.client_files;
CREATE POLICY client_files_select ON public.client_files FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid());
CREATE POLICY client_files_insert ON public.client_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR uploaded_by IS NULL);
CREATE POLICY client_files_update ON public.client_files FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid());
CREATE POLICY client_files_delete ON public.client_files FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid());

CREATE OR REPLACE FUNCTION public.set_client_file_uploaded_by()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN NEW.uploaded_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_client_files_uploaded_by ON public.client_files;
CREATE TRIGGER trg_client_files_uploaded_by BEFORE INSERT ON public.client_files
  FOR EACH ROW EXECUTE FUNCTION public.set_client_file_uploaded_by();

-- client_note_attachments: visibility follows parent note
DROP POLICY IF EXISTS client_note_att_all_auth ON public.client_note_attachments;
CREATE POLICY client_note_att_select ON public.client_note_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_notes n WHERE n.id = note_id
    AND (public.has_role(auth.uid(),'admin') OR n.created_by = auth.uid())));
CREATE POLICY client_note_att_insert ON public.client_note_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_notes n WHERE n.id = note_id
    AND (public.has_role(auth.uid(),'admin') OR n.created_by = auth.uid())));
CREATE POLICY client_note_att_update ON public.client_note_attachments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_notes n WHERE n.id = note_id
    AND (public.has_role(auth.uid(),'admin') OR n.created_by = auth.uid())));
CREATE POLICY client_note_att_delete ON public.client_note_attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_notes n WHERE n.id = note_id
    AND (public.has_role(auth.uid(),'admin') OR n.created_by = auth.uid())));
