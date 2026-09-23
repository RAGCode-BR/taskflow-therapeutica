-- Keep hidden modules in the codebase, but remove their keys from every saved
-- access set. Re-enabling a module later only requires adding it back to the UI
-- and assigning its permission again.
UPDATE public.user_permissions
SET permissions = ARRAY(
  SELECT permission
  FROM unnest(permissions) AS permission
  WHERE permission = ANY (ARRAY[
    'mural',
    'dashboard',
    'tasks',
    'conversations',
    'obligations',
    'clients',
    'reports',
    'users',
    'trash',
    'settings'
  ]::text[])
);

UPDATE public.workspace_memberships
SET permissions = ARRAY(
  SELECT permission
  FROM unnest(permissions) AS permission
  WHERE permission = ANY (ARRAY[
    'mural',
    'dashboard',
    'tasks',
    'conversations',
    'obligations',
    'clients',
    'reports',
    'users',
    'trash',
    'settings'
  ]::text[])
);

NOTIFY pgrst, 'reload schema';
