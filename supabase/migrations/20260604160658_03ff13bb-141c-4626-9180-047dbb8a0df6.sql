
CREATE POLICY "auth_can_select_attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-attachments');
CREATE POLICY "auth_can_upload_attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "auth_can_delete_attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-attachments');
