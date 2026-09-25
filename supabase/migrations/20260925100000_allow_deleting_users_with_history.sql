-- Permite excluir usuários que criaram registros (em geral administradores).
-- Estas colunas usavam ON DELETE RESTRICT/NO ACTION: o Auth não conseguia
-- apagar o perfil e a exclusão falhava com "Database error deleting user".
-- Agora o registro permanece e só perde a referência a quem o criou.

DO $$
DECLARE
  target record;
  constraint_name text;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('obligations', 'created_by', 'public.profiles'),
      ('obligation_departments', 'created_by', 'public.profiles'),
      ('calendar_events', 'created_by', 'auth.users'),
      ('service_requests', 'created_by', 'public.profiles'),
      ('service_request_messages', 'author_id', 'public.profiles'),
      ('service_request_attachments', 'uploaded_by', 'public.profiles'),
      ('client_notes', 'created_by', 'auth.users'),
      ('client_note_attachments', 'uploaded_by', 'auth.users')
    ) AS item(table_name, column_name, referenced_table)
  LOOP
    IF to_regclass(format('public.%I', target.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    -- Remove a chave estrangeira atual, qualquer que seja o nome gerado.
    FOR constraint_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f'
        AND con.conrelid = format('public.%I', target.table_name)::regclass
        AND array_length(con.conkey, 1) = 1
        AND att.attname = target.column_name
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I DROP CONSTRAINT %I',
        target.table_name,
        constraint_name
      );
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL',
      target.table_name,
      target.column_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL',
      target.table_name,
      format('%s_%s_fkey', target.table_name, target.column_name),
      target.column_name,
      target.referenced_table
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
