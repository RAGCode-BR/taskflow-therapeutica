-- Therapeutica uses one internal workspace. The application keeps the workspace
-- column as an authorization boundary, but does not expose an environment picker.
DO $$
DECLARE
  primary_workspace_id uuid;
  removed_workspace_id uuid;
BEGIN
  SELECT id INTO primary_workspace_id
  FROM public.workspaces
  WHERE slug = 'consultoria';

  SELECT id INTO removed_workspace_id
  FROM public.workspaces
  WHERE slug = 'marketing';

  IF primary_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Primary workspace was not created';
  END IF;

  UPDATE public.workspaces
  SET name = 'Therapeutica'
  WHERE id = primary_workspace_id;

  IF removed_workspace_id IS NOT NULL THEN
    UPDATE public.profiles
    SET active_workspace_id = primary_workspace_id
    WHERE active_workspace_id = removed_workspace_id;

    -- A fresh installation only has seeded board metadata here. These explicit
    -- deletions also make the migration safe if it is replayed during setup.
    DELETE FROM public.user_task_order WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.user_column_order WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.board_preferences WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.obligation_occurrences WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.obligations WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.service_requests WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.mural_posts WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.calendar_events WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.tasks WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.task_tags WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.task_statuses WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.kanban_columns WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.clients WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.workspace_access_settings WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.workspace_memberships WHERE workspace_id = removed_workspace_id;
    DELETE FROM public.workspaces WHERE id = removed_workspace_id;
  END IF;
END $$;

-- Client mirroring existed solely to copy Consultoria clients into Marketing.
DROP TRIGGER IF EXISTS trg_sync_consultoria_client_to_marketing ON public.clients;
DROP FUNCTION IF EXISTS public.sync_consultoria_client_to_marketing();

NOTIFY pgrst, 'reload schema';
