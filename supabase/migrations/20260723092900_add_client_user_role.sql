-- Keep this enum change in its own migration: PostgreSQL requires a commit before a
-- newly added enum value can be used by tables, functions, or policies.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
