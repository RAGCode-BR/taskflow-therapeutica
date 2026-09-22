INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS profile_avatars_select ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_insert_own ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_update_own ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_delete_own ON storage.objects;

CREATE POLICY profile_avatars_select ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-avatars');

CREATE POLICY profile_avatars_insert_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY profile_avatars_update_own ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY profile_avatars_delete_own ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
