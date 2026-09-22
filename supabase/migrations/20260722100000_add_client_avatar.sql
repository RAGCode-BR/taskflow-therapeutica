ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS avatar_path text;
