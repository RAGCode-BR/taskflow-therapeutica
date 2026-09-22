-- Creates the private bucket used by task attachments and client logos.
-- Existing projects may already have this bucket; the conflict clause keeps this safe to run.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760
)
ON CONFLICT (id) DO NOTHING;
