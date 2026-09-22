-- Guarantees that client logos work even if the previous migration was not applied.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS avatar_path text;

-- Refreshes Supabase's REST schema cache so avatar_path is available immediately.
NOTIFY pgrst, 'reload schema';
