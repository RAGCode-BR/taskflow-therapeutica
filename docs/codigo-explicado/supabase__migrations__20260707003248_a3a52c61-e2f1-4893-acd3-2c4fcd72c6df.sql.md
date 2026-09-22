# supabase/migrations/20260707003248_a3a52c61-e2f1-4893-acd3-2c4fcd72c6df.sql

Tipo: Migration SQL do Supabase.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `-- 1) Histórico de mudanças de prazo (com justificativa opcional)` | Comentario da migration; explica a intencao daquele trecho SQL. |
| 2 | `CREATE TABLE public.task_due_date_changes (` | Cria uma tabela no banco de dados Supabase/PostgreSQL. |
| 3 | `  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),` | Define identificador unico principal do registro. |
| 4 | `  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,` | Define relacionamento entre tabelas por chave estrangeira. |
| 5 | `  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,` | Define relacionamento entre tabelas por chave estrangeira. |
| 6 | `  old_due_date timestamptz,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 7 | `  new_due_date timestamptz,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 8 | `  reason text,` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 9 | `  created_at timestamptz NOT NULL DEFAULT now()` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 10 | `);` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 11 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 12 | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_due_date_changes TO authenticated;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 13 | `GRANT ALL ON public.task_due_date_changes TO service_role;` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 14 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 15 | `ALTER TABLE public.task_due_date_changes ENABLE ROW LEVEL SECURITY;` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 16 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 17 | `CREATE POLICY "view due changes for accessible tasks"` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 18 | `  ON public.task_due_date_changes FOR SELECT TO authenticated` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 19 | `  USING (public.can_view_task(task_id));` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 20 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 21 | `CREATE POLICY "insert due changes for accessible tasks"` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 22 | `  ON public.task_due_date_changes FOR INSERT TO authenticated` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 23 | `  WITH CHECK (public.can_view_task(task_id) AND (user_id IS NULL OR user_id = auth.uid()));` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 24 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 25 | `CREATE POLICY "update own due changes"` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 26 | `  ON public.task_due_date_changes FOR UPDATE TO authenticated` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 27 | `  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 28 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 29 | `CREATE POLICY "delete own due changes"` | Cria uma regra de seguranca RLS para controlar acesso aos dados. |
| 30 | `  ON public.task_due_date_changes FOR DELETE TO authenticated` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 31 | `  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));` | Executa parte da mudanca estrutural ou de seguranca do banco. |
| 32 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 33 | `CREATE INDEX idx_task_due_changes_task ON public.task_due_date_changes(task_id, created_at DESC);` | Cria indice para acelerar consultas frequentes. |
| 34 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 35 | `-- 2) Subtarefa vinculada opcionalmente a uma seção dobrável (comments)` | Comentario da migration; explica a intencao daquele trecho SQL. |
| 36 | `ALTER TABLE public.subtasks` | Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas. |
| 37 | `  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;` | Define relacionamento entre tabelas por chave estrangeira. |
| 38 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 39 | `CREATE INDEX IF NOT EXISTS idx_subtasks_comment ON public.subtasks(comment_id);` | Cria indice para acelerar consultas frequentes. |
| 40 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
