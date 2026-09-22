# supabase/migrations/20260610221828_39de7eae-9f2b-4f1c-b4db-a0cc4498d19c.sql

Tipo: Migration SQL do Supabase.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 2 | `CREATE TABLE public.client_notes (` | Cria uma tabela no banco de dados Supabase/PostgreSQL. |
| 3 | `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),` | Define identificador unico principal do registro. |
| 4 | `  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,` | Define relacionamento entre tabelas por chave estrangeira. |
| 5 | `  title TEXT NOT NULL DEFAULT '',` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 6 | `  content TEXT NOT NULL DEFAULT '',` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 7 | `  done BOOLEAN NOT NULL DEFAULT false,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 8 | `  position INT NOT NULL DEFAULT 0,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 9 | `  created_by UUID REFERENCES auth.users(id),` | Define relacionamento entre tabelas por chave estrangeira. |
| 10 | `  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 11 | `  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` | Atualiza registros existentes no banco. |
| 12 | `);` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 13 | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 14 | `GRANT ALL ON public.client_notes TO service_role;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 15 | `ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 16 | `CREATE POLICY client_notes_all_auth ON public.client_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 17 | `CREATE TRIGGER client_notes_set_updated_at BEFORE UPDATE ON public.client_notes` | Cria gatilho que executa uma funcao automaticamente em eventos da tabela. |
| 18 | `  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 19 | `CREATE INDEX client_notes_client_idx ON public.client_notes(client_id);` | Cria indice para acelerar consultas frequentes. |
| 20 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 21 | `CREATE TABLE public.client_note_attachments (` | Cria uma tabela no banco de dados Supabase/PostgreSQL. |
| 22 | `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),` | Define identificador unico principal do registro. |
| 23 | `  note_id UUID NOT NULL REFERENCES public.client_notes(id) ON DELETE CASCADE,` | Define relacionamento entre tabelas por chave estrangeira. |
| 24 | `  file_name TEXT NOT NULL,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 25 | `  storage_path TEXT NOT NULL,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 26 | `  mime_type TEXT,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 27 | `  size_bytes BIGINT,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 28 | `  uploaded_by UUID REFERENCES auth.users(id),` | Define relacionamento entre tabelas por chave estrangeira. |
| 29 | `  created_at TIMESTAMPTZ NOT NULL DEFAULT now()` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 30 | `);` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 31 | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_note_attachments TO authenticated;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 32 | `GRANT ALL ON public.client_note_attachments TO service_role;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 33 | `ALTER TABLE public.client_note_attachments ENABLE ROW LEVEL SECURITY;` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 34 | `CREATE POLICY client_note_att_all_auth ON public.client_note_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 35 | `CREATE INDEX client_note_att_note_idx ON public.client_note_attachments(note_id);` | Cria indice para acelerar consultas frequentes. |
| 36 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
